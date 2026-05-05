import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tzuugnotzdfxscfudqvi.supabase.co";
const SUPABASE_KEY = "sb_publishable_v3oazaJnxlcE1xob2Lto2A_LeOo2sM1";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORIES = ["Alla", "Granne", "Vän", "Sport", "Nätverk"];
const CAT_COLORS = {
  Granne: "#4A7C59", Vän: "#C0703A", Sport: "#2A8A6E", Nätverk: "#3A6BA8",
};

function initials(name) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
function score(c) {
  return (c.star ? 50 : 0) + (c.clicks || 0);
}
function noteToList(note) {
  if (!note) return [];
  return note.split("\n").map(l => l.trim()).filter(l => l.length > 0);
}

const EMPTY_FORM = { name: "", category: "Granne", note: "" };

export default function App() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("Alla");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [profileId, setProfileId] = useState(null);
  const [view, setView] = useState("all");
  const nameRef = useRef(null);

  useEffect(() => { fetchContacts(); }, []);
  useEffect(() => { if (showForm && nameRef.current) nameRef.current.focus(); }, [showForm]);

  async function fetchContacts() {
    setLoading(true);
    const { data, error } = await supabase.from("contacts").select("*").order("created", { ascending: false });
    if (!error) setContacts(data || []);
    setLoading(false);
  }

  const topContacts = [...contacts].filter(c => score(c) > 0).sort((a, b) => score(b) - score(a)).slice(0, 5);
  const filtered = contacts.filter(c => {
    const matchCat = filter === "Alla" || c.category === filter;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.note || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function openAdd() {
    setEditId(null); setForm(EMPTY_FORM); setFormError(""); setShowForm(true);
  }
  function openEdit(c) {
    setEditId(c.id);
    setForm({ name: c.name, category: c.category, note: c.note || "" });
    setFormError(""); setShowForm(true);
  }

  async function saveForm() {
    if (!form.name.trim()) { setFormError("Namn krävs."); return; }
    setSaving(true);
    if (editId) {
      await supabase.from("contacts").update({
        name: form.name.trim(), category: form.category, note: form.note.trim()
      }).eq("id", editId);
    } else {
      const newId = Date.now();
      await supabase.from("contacts").insert({
        id: newId, name: form.name.trim(), category: form.category, note: form.note.trim(),
        created: new Date().toISOString(), clicks: 0, star: false
      });
    }
    setSaving(false); setShowForm(false); setEditId(null); setFormError("");
    await fetchContacts();
  }

  async function deleteContact(id) {
    await supabase.from("contacts").delete().eq("id", id);
    setProfileId(null); await fetchContacts();
  }

  async function toggleStar(id) {
    const c = contacts.find(x => x.id === id);
    await supabase.from("contacts").update({ star: !c.star }).eq("id", id);
    await fetchContacts();
  }

  async function openProfile(c) {
    setProfileId(c.id);
    await supabase.from("contacts").update({ clicks: (c.clicks || 0) + 1 }).eq("id", c.id);
    setContacts(prev => prev.map(x => x.id === c.id ? { ...x, clicks: (x.clicks || 0) + 1 } : x));
  }

  const profileContact = contacts.find(c => c.id === profileId);

  // PROFILE VIEW
  if (profileContact && !showForm) {
    const color = CAT_COLORS[profileContact.category] || "#7A7A7A";
    const notes = noteToList(profileContact.note);
    return (
      <div style={s.root}>
        <div style={{ ...s.profileHeader, background: color }}>
          <button style={s.backBtn} onClick={() => setProfileId(null)}>←</button>
          <div style={s.profileActions}>
            <button style={s.iconBtn} onClick={() => openEdit(profileContact)}>✏️</button>
            <button style={s.iconBtn} onClick={() => {
              if (window.confirm(`Ta bort ${profileContact.name}?`)) deleteContact(profileContact.id);
            }}>🗑️</button>
          </div>
        </div>

        <div style={{ ...s.profileTop, background: color }}>
          <div style={s.profileAvatar}>{initials(profileContact.name)}</div>
          <div style={s.profileName}>{profileContact.name}</div>
          <div style={s.profileCat}>{profileContact.category}</div>
          <button style={s.starBtnProfile} onClick={() => toggleStar(profileContact.id)}>
            {profileContact.star ? "⭐" : "☆"}
          </button>
        </div>

        <div style={s.profileBody}>
          <div style={s.infoCard}>
            <div style={s.infoTitle}>Anteckningar</div>
            {notes.length === 0 ? (
              <div style={s.emptyNote}>Inga anteckningar ännu – tryck ✏️ för att lägga till.</div>
            ) : (
              <ul style={s.noteList}>
                {notes.map((line, i) => (
                  <li key={i} style={s.noteItem}>
                    <span style={s.noteDot}>•</span>
                    <span style={s.noteText}>{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MAIN LIST VIEW
  return (
    <div style={s.root}>
      <div style={s.header}>
        <div>
          <div style={s.headerTitle}>Kollen</div>
          <div style={s.headerSub}>Du vet vad som gäller</div>
        </div>
        <button style={s.addBtn} onClick={openAdd}>+</button>
      </div>

      <div style={s.tabBar}>
        <button style={{ ...s.tab, ...(view === "all" ? s.tabActive : {}) }} onClick={() => setView("all")}>Alla kontakter</button>
        <button style={{ ...s.tab, ...(view === "top" ? s.tabActive : {}) }} onClick={() => setView("top")}>⭐ Topplista</button>
      </div>

      {loading ? (
        <div style={s.loading}>Laddar…</div>
      ) : view === "top" ? (
        <div style={{ padding: "0 16px" }}>
          <div style={s.topHeader}>Rangordnat på stjärnor + besök</div>
          {topContacts.length === 0 ? (
            <div style={s.empty}>{"Inga toppkontakter ännu.\nStjärnmärk favoriter eller öppna kontakter ofta."}</div>
          ) : topContacts.map((c, i) => (
            <div key={c.id} style={s.topCard} onClick={() => openProfile(c)}>
              <div style={s.topRank}>#{i + 1}</div>
              <div style={{ ...s.avatar, background: CAT_COLORS[c.category] || "#7A7A7A", width: 36, height: 36, fontSize: 13 }}>{initials(c.name)}</div>
              <div style={s.cardBody}>
                <div style={s.cardNameRow}>
                  <span style={s.cardName}>{c.name}</span>
                  {c.star && <span style={{ fontSize: 13 }}>⭐</span>}
                </div>
                <div style={s.cardMeta}>
                  <span style={{ ...s.catBadge, background: (CAT_COLORS[c.category] || "#7A7A7A") + "22", color: CAT_COLORS[c.category] || "#7A7A7A" }}>{c.category}</span>
                  <span style={s.clickCount}>👆 {c.clicks || 0}</span>
                </div>
              </div>
              <div style={s.scoreChip}>{score(c)}p</div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={s.searchWrap}>
            <span style={s.searchIcon}>🔍</span>
            <input style={s.searchInput} placeholder="Sök namn eller anteckning…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button style={s.clearBtn} onClick={() => setSearch("")}>×</button>}
          </div>
          <div style={s.filterRow}>
            {CATEGORIES.map(cat => (
              <button key={cat} style={{
                ...s.filterChip,
                ...(filter === cat ? s.filterChipActive : {}),
                ...(filter === cat && cat !== "Alla" ? { background: CAT_COLORS[cat], borderColor: CAT_COLORS[cat], color: "#fff" } : {}),
              }} onClick={() => setFilter(cat)}>{cat}</button>
            ))}
          </div>
          <div style={s.countRow}>{filtered.length} {filtered.length === 1 ? "kontakt" : "kontakter"}</div>
          <div style={s.list}>
            {filtered.length === 0 && <div style={s.empty}>{search ? "Inga träffar." : "Ingen här ännu – lägg till din första!"}</div>}
            {filtered.map(c => (
              <div key={c.id} style={s.card} onClick={() => openProfile(c)}>
                <div style={{ ...s.avatar, background: CAT_COLORS[c.category] || "#7A7A7A" }}>{initials(c.name)}</div>
                <div style={s.cardBody}>
                  <div style={s.cardNameRow}>
                    <span style={s.cardName}>{c.name}</span>
                    {c.star && <span style={{ fontSize: 13 }}>⭐</span>}
                  </div>
                  <div style={s.cardMeta}>
                    <span style={{ ...s.catBadge, background: (CAT_COLORS[c.category] || "#7A7A7A") + "22", color: CAT_COLORS[c.category] || "#7A7A7A" }}>{c.category}</span>
                  </div>
                  {c.note && <div style={s.note}>{noteToList(c.note)[0]}</div>}
                </div>
                <div style={s.chevron}>›</div>
              </div>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>{editId ? "Redigera kontakt" : "Ny kontakt"}</div>
            <label style={s.label}>Namn *</label>
            <input ref={nameRef} style={s.input} placeholder="För- och efternamn" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} onKeyDown={e => e.key === "Enter" && saveForm()} />
            {formError && <div style={s.error}>{formError}</div>}
            <label style={s.label}>Kategori</label>
            <div style={s.catRow}>
              {CATEGORIES.filter(c => c !== "Alla").map(cat => (
                <button key={cat} style={{ ...s.catChip, ...(form.category === cat ? { background: CAT_COLORS[cat] || "#2C2C2C", color: "#fff", borderColor: CAT_COLORS[cat] || "#2C2C2C" } : {}) }}
                  onClick={() => setForm({ ...form, category: cat })}>{cat}</button>
              ))}
            </div>
            <label style={s.label}>Anteckningar <span style={{ fontWeight: 400, textTransform: "none", fontSize: 11 }}>(en rad = en punkt)</span></label>
            <textarea style={s.textarea} placeholder={"Gillar padel\nJobbar på Systembolaget\nHar hund"} value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })} />
            <div style={s.modalBtns}>
              <button style={s.cancelBtn} onClick={() => { setShowForm(false); setFormError(""); }}>Avbryt</button>
              <button style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={saveForm} disabled={saving}>
                {saving ? "Sparar…" : editId ? "Spara ändringar" : "Spara"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  root: { fontFamily: "'Georgia', serif", background: "#F7F4EF", minHeight: "100vh", maxWidth: 480, margin: "0 auto" },
  profileHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "52px 20px 0" },
  backBtn: { background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer", padding: 0 },
  profileActions: { display: "flex", gap: 8 },
  iconBtn: { background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 10, width: 44, height: 44, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  profileTop: { display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 20px 40px" },
  profileAvatar: { width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 28, marginBottom: 12, fontFamily: "sans-serif" },
  profileName: { fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 4 },
  profileCat: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 8 },
  starBtnProfile: { background: "none", border: "none", fontSize: 24, cursor: "pointer", padding: 0 },
  profileBody: { padding: "20px 16px 40px", marginTop: -20 },
  infoCard: { background: "#fff", borderRadius: 16, padding: "20px 20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  infoTitle: { fontSize: 12, fontWeight: 700, color: "#9A8F80", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16, fontFamily: "sans-serif" },
  emptyNote: { color: "#C8BFB0", fontSize: 15, fontStyle: "italic" },
  noteList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 },
  noteItem: { display: "flex", alignItems: "flex-start", gap: 10 },
  noteDot: { color: "#C0703A", fontSize: 20, lineHeight: 1.3, flexShrink: 0 },
  noteText: { fontSize: 16, color: "#2C2C2C", lineHeight: 1.5 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "52px 20px 16px", borderBottom: "1px solid #E0D9CF" },
  headerTitle: { fontSize: 26, fontWeight: 700, color: "#2C2C2C", letterSpacing: "-0.5px" },
  headerSub: { fontSize: 13, color: "#9A8F80", marginTop: 2, fontStyle: "italic" },
  addBtn: { width: 44, height: 44, borderRadius: "50%", background: "#2C2C2C", color: "#fff", border: "none", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  tabBar: { display: "flex", borderBottom: "1px solid #E0D9CF" },
  tab: { flex: 1, padding: "13px", border: "none", background: "transparent", fontSize: 14, cursor: "pointer", color: "#9A8F80", fontFamily: "'Georgia', serif", borderBottom: "2.5px solid transparent" },
  tabActive: { color: "#2C2C2C", fontWeight: 700, borderBottom: "2.5px solid #2C2C2C" },
  loading: { textAlign: "center", padding: "60px 20px", color: "#9A8F80", fontSize: 15, fontStyle: "italic" },
  searchWrap: { display: "flex", alignItems: "center", margin: "14px 16px 0", background: "#EDE8E0", borderRadius: 10, padding: "0 12px" },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, border: "none", background: "transparent", padding: "11px 0", fontSize: 15, outline: "none", fontFamily: "'Georgia', serif", color: "#2C2C2C" },
  clearBtn: { background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9A8F80" },
  filterRow: { display: "flex", gap: 8, padding: "14px 16px 0", overflowX: "auto", scrollbarWidth: "none" },
  filterChip: { padding: "6px 14px", borderRadius: 20, border: "1.5px solid #C8BFB0", background: "transparent", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", color: "#5A5047", fontFamily: "'Georgia', serif" },
  filterChipActive: { background: "#2C2C2C", borderColor: "#2C2C2C", color: "#fff" },
  countRow: { padding: "12px 16px 4px", fontSize: 12, color: "#9A8F80", fontStyle: "italic" },
  list: { padding: "0 16px 100px", display: "flex", flexDirection: "column", gap: 10 },
  empty: { textAlign: "center", padding: "60px 20px", color: "#9A8F80", fontSize: 15, fontStyle: "italic", whiteSpace: "pre-line", lineHeight: 1.7 },
  card: { display: "flex", alignItems: "center", gap: 14, background: "#fff", borderRadius: 12, padding: "14px 16px", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  avatar: { width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0, fontFamily: "sans-serif" },
  cardBody: { flex: 1, minWidth: 0 },
  cardNameRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: 600, color: "#2C2C2C" },
  cardMeta: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  catBadge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, letterSpacing: "0.3px", fontFamily: "sans-serif" },
  note: { fontSize: 13, color: "#7A7A7A", marginTop: 4, lineHeight: 1.4, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  chevron: { color: "#C8BFB0", fontSize: 22, flexShrink: 0 },
  topHeader: { fontSize: 12, color: "#9A8F80", fontStyle: "italic", padding: "12px 0 10px" },
  topCard: { display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 12, padding: "12px 14px", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 10 },
  topRank: { fontSize: 13, fontWeight: 700, color: "#C8BFB0", width: 24, textAlign: "center", flexShrink: 0 },
  scoreChip: { fontSize: 12, fontWeight: 700, color: "#9A8F80", background: "#EDE8E0", borderRadius: 8, padding: "3px 8px", flexShrink: 0, fontFamily: "sans-serif" },
  clickCount: { fontSize: 12, color: "#9A8F80", fontFamily: "sans-serif" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 },
  modal: { background: "#F7F4EF", width: "100%", maxWidth: 480, borderRadius: "20px 20px 0 0", padding: "28px 24px 48px", maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { fontSize: 20, fontWeight: 700, color: "#2C2C2C", marginBottom: 20 },
  label: { display: "block", fontSize: 12, color: "#9A8F80", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6, fontFamily: "sans-serif" },
  input: { width: "100%", border: "1.5px solid #E0D9CF", borderRadius: 10, padding: "13px 14px", fontSize: 16, background: "#fff", fontFamily: "'Georgia', serif", color: "#2C2C2C", marginBottom: 16, outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", border: "1.5px solid #E0D9CF", borderRadius: 10, padding: "13px 14px", fontSize: 16, background: "#fff", fontFamily: "'Georgia', serif", color: "#2C2C2C", marginBottom: 20, outline: "none", resize: "none", height: 160, boxSizing: "border-box" },
  catRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  catChip: { padding: "8px 16px", borderRadius: 20, border: "1.5px solid #C8BFB0", background: "transparent", fontSize: 14, cursor: "pointer", color: "#5A5047", fontFamily: "'Georgia', serif" },
  error: { color: "#D44", fontSize: 13, marginTop: -12, marginBottom: 12 },
  modalBtns: { display: "flex", gap: 12 },
  cancelBtn: { flex: 1, padding: "14px", borderRadius: 10, border: "1.5px solid #C8BFB0", background: "transparent", fontSize: 15, cursor: "pointer", fontFamily: "'Georgia', serif", color: "#5A5047" },
  saveBtn: { flex: 2, padding: "14px", borderRadius: 10, border: "none", background: "#2C2C2C", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Georgia', serif" },
};
