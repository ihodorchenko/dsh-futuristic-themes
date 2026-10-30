import AppKit
import WebKit

// Usage: webshot <url> <out.png> [width] [height] [waitSeconds] [jsAfterLoad|@steps.json]
// If <jsAfterLoad> starts with "@", the rest is a JSON file: [{"js": "...", "wait": 1.5}, ...]
// evaluated sequentially (each step waited natively, then the next one runs).
let args = CommandLine.arguments
guard args.count >= 3 else { fputs("usage: webshot <url> <out.png> [width] [height] [waitSeconds] [js]\n", stderr); exit(2) }
let url = URL(string: args[1])!
let outPath = args[2]
let width = args.count > 3 ? Double(args[3]) ?? 1600 : 1600
let height = args.count > 4 ? Double(args[4]) ?? 1000 : 1000
let waitSeconds = args.count > 5 ? Double(args[5]) ?? 3.0 : 3.0
let js = args.count > 6 ? args[6] : nil
let jsWait = args.count > 7 ? Double(args[7]) ?? 0.6 : 0.6
let diagJs = args.count > 8 ? args[8] : nil
struct Step: Decodable { let js: String; let wait: Double? }
var steps: [Step] = []
if let raw = js, raw.hasPrefix("@") {
    let path = String(raw.dropFirst())
    if let data = FileManager.default.contents(atPath: path) {
        steps = (try? JSONDecoder().decode([Step].self, from: data)) ?? []
    } else {
        fputs("cannot read steps file \(path)\n", stderr); exit(8)
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)

let config = WKWebViewConfiguration()
config.websiteDataStore = .nonPersistent()
config.preferences.setValue(true, forKey: "developerExtrasEnabled")
let webView = WKWebView(frame: NSRect(x: 0, y: 0, width: width, height: height), configuration: config)

let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: width, height: height),
                      styleMask: [.borderless], backing: .buffered, defer: false)
window.contentView = webView
window.setFrameOrigin(NSPoint(x: -20000, y: -20000))
window.orderBack(nil)

final class Delegate: NSObject, WKNavigationDelegate {
    var finished = false
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { finished = true }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        fputs("navigation failed: \(error)\n", stderr); exit(3)
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        fputs("provisional navigation failed: \(error)\n", stderr); exit(3)
    }
}
let delegate = Delegate()
webView.navigationDelegate = delegate

func snapshot() {
    let snapConfig = WKSnapshotConfiguration()
    snapConfig.rect = NSRect(x: 0, y: 0, width: width, height: height)
    webView.takeSnapshot(with: snapConfig) { image, error in
        guard let image = image, let tiff = image.tiffRepresentation,
              let rep = NSBitmapImageRep(data: tiff),
              let png = rep.representation(using: .png, properties: [:]) else {
            fputs("snapshot failed: \(String(describing: error))\n", stderr); exit(4)
        }
        do {
            try png.write(to: URL(fileURLWithPath: outPath))
            print("wrote \(outPath) \(image.size.width)x\(image.size.height)")
            exit(0)
        } catch { fputs("write failed: \(error)\n", stderr); exit(5) }
    }
}

webView.load(URLRequest(url: url))

func runSteps(_ webView: WKWebView, steps: [Step], index: Int) {
    if index >= steps.count { finish(webView); return }
    let step = steps[index]
    webView.evaluateJavaScript(step.js) { _, err in
        if let err = err { fputs("step \(index) error: \(err)\n", stderr) }
        let wait = step.wait ?? jsWait
        DispatchQueue.main.asyncAfter(deadline: .now() + wait) {
            runSteps(webView, steps: steps, index: index + 1)
        }
    }
}

func finish(_ webView: WKWebView) {
    if let diag = diagJs {
        webView.evaluateJavaScript(diag) { value, error in
            if let value = value { fputs("diag: \(value)\n", stderr) }
            if let error = error { fputs("diag error: \(error)\n", stderr) }
            snapshot()
        }
    } else {
        snapshot()
    }
}

DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
    // Poll for navigation finished, then extra settle time and optional JS.
    var waited = 0.0
    let timer = Timer(timeInterval: 0.1, repeats: true) { t in
        waited += 0.1
        if delegate.finished || waited > 20 {
            t.invalidate()
            let settle = DispatchQueue.main.asyncAfter(deadline: .now() + waitSeconds) {
                if !steps.isEmpty {
                    runSteps(webView, steps: steps, index: 0)
                } else if let js = js {
                    webView.evaluateJavaScript(js) { _, err in
                        if let err = err { fputs("js error: \(err)\n", stderr) }
                        DispatchQueue.main.asyncAfter(deadline: .now() + jsWait) { finish(webView) }
                    }
                } else {
                    snapshot()
                }
            }
            _ = settle
        }
    }
    RunLoop.main.add(timer, forMode: .common)
}

DispatchQueue.main.asyncAfter(deadline: .now() + 40) { fputs("timeout\n", stderr); exit(6) }
app.run()
