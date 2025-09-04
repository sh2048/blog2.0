// scripts/comments.js
// Minimal, framework-free comments widget that talks to blog8 API.
// Usage: include on pages where you want comments:
//   <link rel="stylesheet" href="styles/comments.css">
//   <div id="comments-root" data-post-slug="YOUR-SLUG"></div>
//   <script src="scripts/comments.js" defer></script>

(function () {
  const API_BASE = "https://blog8.vercel.app/api/comments";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, attrs={}, children=[]) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v]) => {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    });
    children.forEach(c => node.appendChild(c));
    return node;
  }

  function deriveSlug(root) {
    const explicit = root.getAttribute("data-post-slug");
    if (explicit) return explicit;
    // Fallback: derive from URL path (/foo/bar.html -> bar)
    try {
      const path = location.pathname;
      const last = path.split("/").filter(Boolean).pop() || "index";
      return last.replace(/\.[a-zA-Z0-9]+$/, "") || "index";
    } catch { return "index"; }
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error("Network error: " + res.status);
    return res.json();
  }

  function renderList(root, comments) {
    const list = el("ol", { class: "cm-list" });
    comments.forEach(c => {
      const item = el("li", { class: "cm-item" });
      const header = el("div", { class: "cm-meta" });
      header.append(
        el("strong", { text: c.name }),
        el("span", { class: "cm-date", text: " • " + new Date(c.createdAt).toLocaleString() })
      );
      const body = el("div", { class: "cm-body", text: c.content });
      item.append(header, body);
      list.appendChild(item);
    });
    return list;
  }

  function buildForm(slug, onPosted) {
    const form = el("form", { class: "cm-form" });
    const name = el("input", { name: "name", placeholder: "昵称（必填）", required: "true" });
    const email = el("input", { name: "email", placeholder: "邮箱（可选，不公开）", type: "email" });
    const content = el("textarea", { name: "content", rows: "4", placeholder: "写下你的评论…" });
    const btn = el("button", { type: "submit", class: "cm-btn", text: "提交评论" });
    form.append(name, email, content, btn);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      btn.disabled = true;
      try {
        const payload = {
          name: name.value.trim(),
          email: email.value.trim(),
          content: content.value.trim(),
          parentId: null
        };
        if (!payload.name || !payload.content) {
          alert("请填写昵称和评论内容"); btn.disabled = false; return;
        }
        const res = await fetch(`${API_BASE}/${encodeURIComponent(slug)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data && data.error || "提交失败");
        name.value = ""; email.value = ""; content.value = "";
        onPosted && onPosted(data.comment);
      } catch (err) {
        console.error(err);
        alert("提交失败，请稍后重试");
      } finally {
        btn.disabled = false;
      }
    });

    return form;
  }

  async function mount(root) {
    const widget = el("section", { class: "cm-root" });
    const title = el("h3", { class: "cm-title", text: "评论" });
    const container = el("div", { class: "cm-container" });

    const slug = deriveSlug(root);
    root.dataset.postSlug = slug;

    widget.appendChild(title);
    widget.appendChild(container);

    root.appendChild(widget);

    // Load comments
    let comments = [];
    try {
      const data = await fetchJSON(`${API_BASE}/${encodeURIComponent(slug)}`);
      comments = Array.isArray(data.comments) ? data.comments : [];
    } catch (err) {
      console.warn("加载评论失败：", err);
    }

    const listNode = renderList(root, comments);
    const formNode = buildForm(slug, (newComment) => {
      // Append new comment to list
      listNode.appendChild(el("li", { class: "cm-item" }, [
        el("div", { class: "cm-meta" }, [
          el("strong", { text: newComment.name }),
          el("span", { class: "cm-date", text: " • " + new Date(newComment.createdAt).toLocaleString() })
        ]),
        el("div", { class: "cm-body", text: newComment.content })
      ]));
    });

    container.append(listNode, formNode);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("comments-root");
    if (root) mount(root);
  });
})();