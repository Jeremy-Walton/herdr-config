import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, panes, theme, shared, props, run, exec, readTextFile, home } from "herdr";

// Read portless's state files: its CLI is a nodenv shim the app's PATH can't find.
// Alias routes have pid 0, so no folder to tie them to a space.
const portless = (file) => readTextFile(`${home()}/.portless/${file}`);
const inside = (dir, root) => dir === root || dir.startsWith(root + "/");

// Rough width of 11.8 px Geist text, measured from screenshots. A bit generous so nothing clips.
const CHAR_PX = 6.1;

// The islands' fill at the opacity in islands-workspace-chrome/settings.json (1 when unset).
const islandFill = (c) => {
  const o = shared("islands.opacity");
  if (typeof o !== "number" || o >= 1 || !/^#[0-9a-f]{6}$/i.test(c)) return c;
  return c + Math.round(Math.max(0, o) * 255).toString(16).padStart(2, "0");
};

export default class WorkspaceStatus extends View {
  init(_props, cx) {
    this.servers = []; // [{ url, cwd }]
    cx.timer.every(5000, (cx) => this.refreshServers(cx));
    this.refreshServers(cx);
  }

  refreshServers(cx) {
    if (this.loading) return;
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        const routes = JSON.parse(await portless("routes.json")).filter((r) => r.pid > 0);
        const tls = (await portless("proxy.tls").catch(() => "")).trim() === "1";
        const defaultPort = tls ? 443 : 80;
        const port = Number(await portless("proxy.port").catch(() => "")) || defaultPort;
        const url = (host) => `${tls ? "https" : "http"}://${host}${port === defaultPort ? "" : `:${port}`}`;
        // One lsof for every pid; a dead pid prints nothing, which drops its stale route.
        const cwdOf = {};
        if (routes.length) {
          const l = await exec("/usr/sbin/lsof", ["-a", "-p", routes.map((r) => r.pid).join(","), "-d", "cwd", "-Fpn"]);
          let pid;
          for (const line of l.stdout.split("\n")) {
            if (line[0] === "p") pid = line.slice(1);
            if (line[0] === "n") cwdOf[pid] = line.slice(1);
          }
        }
        const servers = routes.map((r) => ({ url: url(r.hostname), cwd: cwdOf[r.pid] })).filter((s) => s.cwd);
        if (JSON.stringify(servers) !== JSON.stringify(this.servers)) { this.servers = servers; cx.notify(); }
      } catch {
        // No portless state yet: keep the last list.
      } finally {
        this.loading = false;
      }
    });
  }

  // A server belongs to a space when one of the space's terminals is in the server's checkout.
  spaceServers(space) {
    if (!space || space.machine) return [];
    const tabs = new Set(space.tabs.map((t) => t.id));
    const dirs = panes().filter((p) => tabs.has(p.tab) && p.cwd).map((p) => p.cwd);
    return this.servers.filter((s) => dirs.some((d) => inside(d, s.cwd)));
  }

  render() {
    const t = theme();
    const space = spaces().find(s => s.active);
    const servers = this.spaceServers(space);
    const host = (url) => url.replace(/^https?:\/\//, "");
    const list = agents();
    const needs = list.filter(a => a.status === "blocked").length;
    // props.fit: "<node id>" resizes that layout node to this card's content width.
    const fit = props()?.fit;
    if (fit) {
      const texts = [space?.machine ?? "This computer", space?.branch, `${list.length} agents`, needs > 0 && `· ${needs} needs you`, ...servers.map((s) => host(s.url))].filter(Boolean);
      const chars = texts.reduce((n, s) => n + s.length, 0);
      // padding 28, border 2, icons 19 each, dot 12, gaps 16 between items and 6 before "needs you".
      const icons = (space?.branch ? 2 : 1) + servers.length;
      const px = Math.ceil(30 + 19 * icons + 12 + 16 * icons + (needs > 0 ? 6 : 0) + chars * CHAR_PX);
      if (px !== this.fitPx) { this.fitPx = px; run("layout.resize", { id: fit, px }); }
    }
    const label = (icon, text, color) => h_flex().gap(6).items_center().child(svg(`mods/workspace-chrome/${icon}.svg`).size(13).text_color(color)).child(text); // colored icon, muted text
    return h_flex().size_full().px(14).gap(16).items_center().rounded(13).overflow_hidden().bg(islandFill(t.chrome)).text_size(11.8).text_color(t.muted) // its own card, no divider
      .child(label(space?.machine ? "server" : "monitor", space?.machine ?? "This computer", t.working))
      .when(Boolean(space?.branch), el => el.child(label("branch", space.branch, t.accent)))
      .child(h_flex().gap(6).items_center().child(div().size(6).rounded(3).bg(needs > 0 ? t.blocked : list.length > 0 ? t.done : t.dim)).child(`${list.length} agents`)
        .when(needs > 0, el => el.child(div().text_color(t.blocked).child(`· ${needs} needs you`))))
      .children(servers.map((s) =>
        h_flex().id(`server-${s.url}`).gap(6).items_center().cursor_pointer().hover((st) => st.text_color(t.foreground))
          .on_click(() => { exec("open", [s.url]).catch(() => {}); })
          .child(svg("mods/islands-workspace-status/link.svg").size(13).text_color(t.done))
          .child(host(s.url))));
  }
}
