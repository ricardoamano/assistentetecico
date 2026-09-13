/* @ds-bundle: {"format":4,"namespace":"NEOSTOREDesignSystem_019df4","components":[],"sourceHashes":{"ui_kits/dashboard/components.jsx":"3493c640effd","ui_kits/proposal/components.jsx":"4577494a1652","ui_kits/web/components.jsx":"bb3214a1b55c"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.NEOSTOREDesignSystem_019df4 = window.NEOSTOREDesignSystem_019df4 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/dashboard/components.jsx
try { (() => {
// Internal operations dashboard — NEOSTORE
// Layout: sidebar + main with KPI strip + events table

function Sidebar() {
  const item = active => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    color: active ? '#fff' : 'var(--neo-mist)',
    background: active ? 'rgba(31,110,120,0.18)' : 'transparent',
    cursor: 'pointer'
  });
  const ico = {
    width: 18,
    height: 18,
    stroke: 'currentColor',
    strokeWidth: 1.75,
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  };
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 240,
      background: 'var(--neo-ink)',
      color: '#fff',
      padding: '20px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      borderRight: '1px solid rgba(255,255,255,0.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 10px 18px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-horizontal-color-dark.png?v=5",
    style: {
      height: 60,
      maxWidth: '100%',
      objectFit: 'contain'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--neo-fog)',
      padding: '12px 14px 6px'
    }
  }, "Opera\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: item(true)
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    style: ico
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "14",
    width: "7",
    height: "7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "14",
    width: "7",
    height: "7"
  })), "Vis\xE3o geral"), /*#__PURE__*/React.createElement("div", {
    style: item()
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    style: ico
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "2",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "2",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  })), "Eventos"), /*#__PURE__*/React.createElement("div", {
    style: item()
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    style: ico
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "6",
    width: "20",
    height: "14",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 22h8"
  })), "Equipamentos"), /*#__PURE__*/React.createElement("div", {
    style: item()
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    style: ico
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"
  })), "Equipe"), /*#__PURE__*/React.createElement("div", {
    style: item()
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    style: ico
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 18H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 9h4l3 3v5a1 1 0 0 1-1 1h-2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "18",
    r: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "17",
    cy: "18",
    r: "2"
  })), "Log\xEDstica"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--neo-fog)',
      padding: '20px 14px 6px'
    }
  }, "Comercial"), /*#__PURE__*/React.createElement("div", {
    style: item()
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    style: ico
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "14 2 14 8 20 8"
  })), "Propostas"), /*#__PURE__*/React.createElement("div", {
    style: item()
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    style: ico
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "4"
  })), "Clientes"));
}
function Topbar() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 28px',
      borderBottom: '1px solid var(--neo-cloud)',
      background: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--neo-fog)'
    }
  }, "Opera\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: '-0.015em',
      marginTop: 2
    }
  }, "Vis\xE3o geral \xB7 semana 19")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar evento, equipamento, cliente\u2026",
    style: {
      font: '400 13px var(--font-sans)',
      padding: '9px 14px',
      border: '1px solid var(--neo-mist)',
      borderRadius: 6,
      width: 320
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      background: 'var(--neo-teal-500)',
      color: '#fff',
      padding: '9px 16px',
      borderRadius: 6,
      border: 0,
      fontWeight: 600,
      fontSize: 13,
      cursor: 'pointer'
    }
  }, "+ Novo evento"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: 'var(--neo-purple-500)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 700
    }
  }, "RS")));
}
function KPIs() {
  const items = [{
    label: 'Eventos ativos',
    value: '8',
    delta: '+2 vs sem. ant.',
    tone: 'teal'
  }, {
    label: 'Equipamento em rota',
    value: '142',
    delta: 'unidades',
    tone: 'neutral'
  }, {
    label: 'Equipe escalada',
    value: '24',
    delta: '/ 32 disponíveis',
    tone: 'neutral'
  }, {
    label: 'Uptime · 30d',
    value: '99.6%',
    delta: 'Sem incidentes críticos',
    tone: 'success'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16
    }
  }, items.map(k => /*#__PURE__*/React.createElement("div", {
    key: k.label,
    style: {
      background: '#fff',
      border: '1px solid var(--neo-cloud)',
      borderRadius: 10,
      padding: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--neo-fog)'
    }
  }, k.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      fontWeight: 800,
      letterSpacing: '-0.025em',
      marginTop: 8,
      color: k.tone === 'teal' ? 'var(--neo-teal-500)' : k.tone === 'success' ? 'var(--neo-success)' : 'var(--neo-ink)'
    }
  }, k.value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--neo-steel)',
      marginTop: 6,
      fontFamily: 'var(--font-mono)'
    }
  }, k.delta))));
}
function EventsTable() {
  const rows = [['EVT-2241', 'Volutech · Convenção', '14–16 mai', 'Centro de Convenções SP', 'em-operacao', 'Em operação'], ['EVT-2242', 'Banco Trion · Town Hall', '15 mai', 'Auditório matriz', 'pre-producao', 'Pré-produção'], ['EVT-2243', 'Lab Northgate · Lançamento', '18 mai', 'Hotel Tivoli', 'em-rota', 'Em rota'], ['EVT-2244', 'Forium · Painel exec.', '21 mai', 'Estúdio próprio', 'pre-producao', 'Pré-produção'], ['EVT-2245', 'Aelio Capital · Roadshow', '24–26 mai', 'Cinco capitais', 'briefing', 'Briefing']];
  const tone = {
    'em-operacao': {
      bg: 'rgba(46,143,94,0.12)',
      dot: '#2E8F5E',
      fg: '#1F5C3D'
    },
    'pre-producao': {
      bg: 'rgba(194,138,30,0.12)',
      dot: '#C28A1E',
      fg: '#7A5612'
    },
    'em-rota': {
      bg: 'rgba(31,110,120,0.12)',
      dot: '#1F6E78',
      fg: '#12454E'
    },
    'briefing': {
      bg: 'rgba(140,148,152,0.16)',
      dot: '#8C9498',
      fg: '#4A5256'
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid var(--neo-cloud)',
      borderRadius: 10,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid var(--neo-cloud)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 700
    }
  }, "Eventos \xB7 pr\xF3ximas 4 semanas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, ['Todos', 'Em operação', 'Pré-produção', 'Briefing'].map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: t,
    style: {
      padding: '5px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500,
      background: i === 0 ? 'var(--neo-ink)' : '#fff',
      color: i === 0 ? '#fff' : 'var(--neo-ink)',
      border: '1px solid ' + (i === 0 ? 'var(--neo-ink)' : 'var(--neo-mist)'),
      cursor: 'pointer'
    }
  }, t)))), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'var(--neo-paper)'
    }
  }, ['ID', 'Evento', 'Datas', 'Local', 'Status'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      textAlign: 'left',
      padding: '11px 20px',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--neo-fog)'
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, rows.map(([id, name, date, loc, statusKey, statusLabel]) => /*#__PURE__*/React.createElement("tr", {
    key: id,
    style: {
      borderTop: '1px solid var(--neo-cloud)'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '14px 20px',
      fontFamily: 'var(--font-mono)',
      color: 'var(--neo-steel)'
    }
  }, id), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '14px 20px',
      fontWeight: 600
    }
  }, name), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '14px 20px',
      fontFamily: 'var(--font-mono)',
      color: 'var(--neo-steel)'
    }
  }, date), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '14px 20px',
      color: 'var(--neo-steel)'
    }
  }, loc), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '14px 20px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 6,
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      background: tone[statusKey].bg,
      color: tone[statusKey].fg
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: tone[statusKey].dot
    }
  }), statusLabel)))))));
}
Object.assign(window, {
  Sidebar,
  Topbar,
  KPIs,
  EventsTable
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/components.jsx", error: String((e && e.message) || e) }); }

// ui_kits/proposal/components.jsx
try { (() => {
// Commercial proposal — NEOSTORE
// PDF-bound A4 pages. Renders one page per <Page> at 794x1123 (A4 @ 96dpi).

function Page({
  children,
  dark
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 794,
      minHeight: 1123,
      background: dark ? 'var(--neo-ink)' : '#fff',
      color: dark ? '#fff' : 'var(--neo-ink)',
      margin: '24px auto',
      position: 'relative',
      boxShadow: '0 14px 32px rgba(14,17,18,0.08)',
      overflow: 'hidden'
    }
  }, children);
}
function Cover() {
  return /*#__PURE__*/React.createElement(Page, {
    dark: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 56,
      left: 56
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-vertical-color-dark.png?v=5",
    style: {
      height: 60
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: -120,
      bottom: -120,
      opacity: 0.08,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-vertical-color-dark.png?v=5",
    style: {
      width: 600
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 96,
      left: 56,
      right: 56
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--neo-teal-300)'
    }
  }, "Proposta t\xE9cnica \xB7 #2026-014"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 56,
      fontWeight: 800,
      letterSpacing: '-0.025em',
      lineHeight: 1.05,
      marginTop: 16,
      maxWidth: 580
    }
  }, "Conven\xE7\xE3o Anual", /*#__PURE__*/React.createElement("br", null), "Volutech 2026"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 32,
      paddingTop: 24,
      borderTop: '1px solid rgba(255,255,255,0.16)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 24,
      fontSize: 13,
      color: 'var(--neo-mist)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--neo-fog)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }, "Cliente"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      color: '#fff',
      fontWeight: 600
    }
  }, "Volutech S.A.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--neo-fog)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }, "Data prevista"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      color: '#fff',
      fontWeight: 600
    }
  }, "14\u201316 mai 2026")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--neo-fog)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }, "Local"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      color: '#fff',
      fontWeight: 600
    }
  }, "Centro de Conven\xE7\xF5es \xB7 SP")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--neo-fog)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }, "Emitida em"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      color: '#fff',
      fontWeight: 600
    }
  }, "04 mai 2026")))));
}
function PageHeader({
  section,
  page
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '32px 56px 24px',
      borderBottom: '1px solid var(--neo-cloud)',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--neo-fog)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "NEOSTORE \xB7 Volutech 2026"), /*#__PURE__*/React.createElement("span", null, section, " \xB7 pg. ", page));
}
function Scope() {
  const items = [{
    tag: 'Áudio',
    title: 'Console digital + linha balanceada',
    body: 'Console 32ch, monitor in-ear para palco, FOH dedicado.',
    spec: '32 ch · 96kHz · 48V',
    qty: '1'
  }, {
    tag: 'Vídeo',
    title: 'Painel LED principal P2.6',
    body: '8m × 4.5m, 3500 nits, alimentação redundante.',
    spec: '4K @ 60fps',
    qty: '1'
  }, {
    tag: 'Vídeo',
    title: 'Câmera 4K + switcher',
    body: 'Captação multicâmera, switcher 4K com gravação.',
    spec: 'SDI · zoom 30x',
    qty: '4'
  }, {
    tag: 'Iluminação',
    title: 'Moving heads + mesa DMX',
    body: 'Moving heads 380W, par LED, mesa DMX programada.',
    spec: 'DMX · 16ch',
    qty: '24'
  }, {
    tag: 'Operação',
    title: 'Equipe técnica em campo',
    body: 'Coordenador técnico, FOH áudio + vídeo, cabista, suporte LED.',
    spec: 'CLT · 3 dias',
    qty: '8'
  }];
  return /*#__PURE__*/React.createElement(Page, null, /*#__PURE__*/React.createElement(PageHeader, {
    section: "Escopo t\xE9cnico",
    page: "02"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '40px 56px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--neo-teal-500)'
    }
  }, "02 \xB7 Escopo"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 36,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      marginTop: 12,
      lineHeight: 1.1
    }
  }, "O que entregamos no evento"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.55,
      color: 'var(--neo-steel)',
      marginTop: 12,
      maxWidth: 620
    }
  }, "Linha t\xE9cnica completa para os 3 dias de conven\xE7\xE3o, com redund\xE2ncia em pontos cr\xEDticos e equipe pr\xF3pria do briefing \xE0 desmontagem."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 32,
      border: '1px solid var(--neo-cloud)',
      borderRadius: 8,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 3fr 2fr 60px',
      padding: '12px 16px',
      background: 'var(--neo-paper)',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--neo-fog)',
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement("div", null, "Linha"), /*#__PURE__*/React.createElement("div", null, "Item"), /*#__PURE__*/React.createElement("div", null, "Especifica\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, "Qtd")), items.map((x, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 3fr 2fr 60px',
      padding: '14px 16px',
      borderTop: '1px solid var(--neo-cloud)',
      fontSize: 13,
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'var(--neo-teal-50)',
      color: 'var(--neo-teal-700)',
      padding: '3px 8px',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase'
    }
  }, x.tag)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, x.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--neo-steel)',
      marginTop: 2
    }
  }, x.body)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--neo-steel)'
    }
  }, x.spec), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      fontWeight: 600,
      textAlign: 'right'
    }
  }, x.qty))))));
}
function Investment() {
  return /*#__PURE__*/React.createElement(Page, null, /*#__PURE__*/React.createElement(PageHeader, {
    section: "Investimento",
    page: "03"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '40px 56px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--neo-teal-500)'
    }
  }, "03 \xB7 Investimento"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 36,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      marginTop: 12,
      lineHeight: 1.1
    }
  }, "Investimento por linha"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 32,
      display: 'flex',
      flexDirection: 'column',
      gap: 0
    }
  }, [['Áudio', 'R$ 38.400,00'], ['Vídeo e LED', 'R$ 84.200,00'], ['Iluminação cênica', 'R$ 22.800,00'], ['Equipe técnica · 3 dias', 'R$ 28.600,00'], ['Logística e montagem', 'R$ 14.000,00']].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: '18px 0',
      borderBottom: '1px solid var(--neo-cloud)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 15,
      fontWeight: 500
    }
  }, v))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: '24px 0 0',
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 17,
      fontWeight: 700
    }
  }, "Total"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 28,
      fontWeight: 700,
      color: 'var(--neo-teal-500)',
      letterSpacing: '-0.02em'
    }
  }, "R$ 188.000,00"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 32,
      padding: 20,
      background: 'var(--neo-paper)',
      borderLeft: '3px solid var(--neo-teal-500)',
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--neo-fog)'
    }
  }, "Condi\xE7\xF5es"), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: '10px 0 0',
      paddingLeft: 18,
      fontSize: 13,
      lineHeight: 1.7,
      color: 'var(--neo-steel)'
    }
  }, /*#__PURE__*/React.createElement("li", null, "50% na assinatura \xB7 50% at\xE9 5 dias ap\xF3s o evento"), /*#__PURE__*/React.createElement("li", null, "Validade da proposta: 30 dias"), /*#__PURE__*/React.createElement("li", null, "Inclui ensaio t\xE9cnico e desmontagem")))));
}
Object.assign(window, {
  Page,
  Cover,
  Scope,
  Investment,
  PageHeader
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/proposal/components.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/components.jsx
try { (() => {
// Marketing site components — NEOSTORE
// Each component is purely presentational; no state management.

const cssVar = name => `var(--${name})`;

// ─── Header ───────────────────────────────────────────
function Header() {
  const linkStyle = {
    color: 'var(--neo-ink)',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: 14,
    padding: '8px 4px'
  };
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 10,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--neo-cloud)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      padding: '14px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-horizontal-color-transparent.png?v=6",
    alt: "neostore",
    style: {
      height: 96
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: linkStyle
  }, "Solu\xE7\xF5es"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: linkStyle
  }, "Opera\xE7\xE3o"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: linkStyle
  }, "Cases"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: linkStyle
  }, "Empresa"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: linkStyle
  }, "Contato")), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      background: 'var(--neo-teal-500)',
      color: '#fff',
      padding: '10px 18px',
      borderRadius: 6,
      fontWeight: 600,
      fontSize: 14,
      textDecoration: 'none'
    }
  }, "Solicitar or\xE7amento")));
}

// ─── Hero ─────────────────────────────────────────────
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--neo-ink)',
      color: '#fff',
      padding: '96px 32px 120px',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: -40,
      bottom: -40,
      opacity: 0.08,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-vertical-color-transparent.png?v=6",
    style: {
      width: 480
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--neo-teal-300)'
    }
  }, "Tecnologia para eventos \xB7 Em opera\xE7\xE3o desde 2007"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 72,
      fontWeight: 800,
      letterSpacing: '-0.025em',
      lineHeight: 1.05,
      marginTop: 20,
      maxWidth: 880
    }
  }, "Eventos que n\xE3o podem falhar come\xE7am no bastidor."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 19,
      lineHeight: 1.55,
      marginTop: 24,
      maxWidth: 620,
      color: 'var(--neo-mist)'
    }
  }, "\xC1udio, v\xEDdeo, ilumina\xE7\xE3o e tecnologia para conven\xE7\xF5es, congressos e ativa\xE7\xF5es corporativas. Equipe pr\xF3pria, equipamentos calibrados, opera\xE7\xE3o confi\xE1vel do briefing \xE0 desmontagem."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 36
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      background: 'var(--neo-teal-500)',
      color: '#fff',
      padding: '14px 22px',
      borderRadius: 6,
      fontWeight: 600,
      fontSize: 15,
      textDecoration: 'none'
    }
  }, "Solicitar or\xE7amento"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      background: 'transparent',
      color: '#fff',
      padding: '14px 22px',
      borderRadius: 6,
      fontWeight: 600,
      fontSize: 15,
      textDecoration: 'none',
      border: '1px solid rgba(255,255,255,0.24)'
    }
  }, "Conhecer a opera\xE7\xE3o \u2192"))));
}

// ─── Services grid ────────────────────────────────────
const services = [{
  tag: 'Áudio',
  title: 'Áudio profissional',
  body: 'Console digital, linha balanceada, monitoração FOH e palco. Redundância em todos os pontos críticos.',
  spec: '32 ch · 96kHz · 48V'
}, {
  tag: 'Vídeo',
  title: 'Vídeo e LED',
  body: 'Painéis P2.6 a P3.9, switcher 4K, captação multicâmera e operação dedicada em FOH.',
  spec: '4K @ 60fps · 3500 nits'
}, {
  tag: 'Iluminação',
  title: 'Iluminação cênica',
  body: 'Moving heads, par LED, ribaltas e mesa DMX. Mapeamento de cena alinhado ao run-of-show.',
  spec: 'DMX · 16ch · 380W'
}, {
  tag: 'Transmissão',
  title: 'Transmissão e streaming',
  body: 'Encoding broadcast, redundância de internet e operação de transmissão híbrida.',
  spec: 'H.264/H.265 · multibitrate'
}, {
  tag: 'Interatividade',
  title: 'Credenciamento e interatividade',
  body: 'QR codes, totens, leitura de credenciais, votação e quizzes em tempo real.',
  spec: 'Web · iOS · Android'
}, {
  tag: 'Operação',
  title: 'Equipe técnica em campo',
  body: 'Coordenadores, operadores e cabistas na escala correta. Ensaio técnico antes do evento.',
  spec: 'Equipe própria CLT'
}];
function Services() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--neo-paper)',
      padding: '96px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--neo-teal-500)'
    }
  }, "Solu\xE7\xF5es t\xE9cnicas"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 42,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      marginTop: 12,
      maxWidth: 640,
      lineHeight: 1.1
    }
  }, "\xC1udio, v\xEDdeo, ilumina\xE7\xE3o e tecnologia. Em um ritmo s\xF3.")), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'var(--neo-teal-500)',
      fontWeight: 600,
      fontSize: 14,
      textDecoration: 'none'
    }
  }, "Cat\xE1logo completo \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 16,
      gridTemplateColumns: 'repeat(3, 1fr)'
    }
  }, services.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.title,
    style: {
      background: '#fff',
      border: '1px solid var(--neo-cloud)',
      borderRadius: 10,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      alignSelf: 'flex-start',
      background: 'var(--neo-teal-50)',
      color: 'var(--neo-teal-700)',
      padding: '4px 10px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase'
    }
  }, s.tag), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      marginTop: 4
    }
  }, s.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.55,
      color: 'var(--neo-steel)'
    }
  }, s.body), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      paddingTop: 14,
      borderTop: '1px solid var(--neo-cloud)',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--neo-fog)'
    }
  }, s.spec))))));
}

// ─── Stats ────────────────────────────────────────────
function Stats() {
  const items = [{
    n: '18',
    u: 'anos',
    c: 'em operação técnica desde 2007'
  }, {
    n: '1.4k',
    u: 'eventos',
    c: 'corporativos entregues'
  }, {
    n: '32',
    u: 'pessoas',
    c: 'na equipe técnica fixa'
  }, {
    n: '99.6%',
    u: 'uptime',
    c: 'em transmissão e operação'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--neo-graphite)',
      color: '#fff',
      padding: '72px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 32
    }
  }, items.map(i => /*#__PURE__*/React.createElement("div", {
    key: i.c
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 64,
      fontWeight: 800,
      letterSpacing: '-0.03em',
      lineHeight: 1,
      color: 'var(--neo-teal-300)'
    }
  }, i.n, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      color: 'var(--neo-mist)',
      marginLeft: 6
    }
  }, i.u)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--neo-mist)',
      marginTop: 12,
      paddingTop: 12,
      borderTop: '1px solid rgba(255,255,255,0.12)'
    }
  }, i.c))))));
}

// ─── Process ──────────────────────────────────────────
function Process() {
  const steps = [{
    t: 'Briefing técnico',
    d: 'Levantamento de público, formato, escopo e cronograma. Pré-visita quando necessário.'
  }, {
    t: 'Plano de operação',
    d: 'Lista de equipamentos, rider técnico, run-of-show, escala de equipe e plano de contingência.'
  }, {
    t: 'Pré-produção',
    d: 'Testes de bancada, calibração de painéis, ensaio técnico com cliente uma semana antes.'
  }, {
    t: 'Execução em campo',
    d: 'Montagem, operação ao vivo, FOH dedicado, suporte por rádio com a equipe da produção.'
  }, {
    t: 'Desmontagem e RDO',
    d: 'Desmontagem organizada, devolução do espaço e relatório de operação no dia seguinte.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '96px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1000,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--neo-teal-500)'
    }
  }, "Opera\xE7\xE3o"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 42,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      marginTop: 12,
      maxWidth: 720,
      lineHeight: 1.1
    }
  }, "Do planejamento \xE0 desmontagem, no mesmo ritmo."), /*#__PURE__*/React.createElement("ol", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: '48px 0 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 0
    }
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("li", {
    key: s.t,
    style: {
      display: 'grid',
      gridTemplateColumns: '64px 1fr',
      gap: 24,
      padding: '24px 0',
      borderBottom: i < steps.length - 1 ? '1px solid var(--neo-cloud)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--neo-teal-500)',
      fontWeight: 600
    }
  }, "0", i + 1), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: '-0.01em'
    }
  }, s.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      lineHeight: 1.55,
      color: 'var(--neo-steel)',
      marginTop: 6,
      maxWidth: 720
    }
  }, s.d)))))));
}

// ─── CTA band ─────────────────────────────────────────
function CTABand() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--neo-ink)',
      color: '#fff',
      padding: '64px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 40
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 36,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1.1
    }
  }, "Tem um evento que n\xE3o pode falhar?"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      color: 'var(--neo-mist)',
      marginTop: 10
    }
  }, "Mande o briefing t\xE9cnico. Retornamos com o plano de opera\xE7\xE3o em at\xE9 48h.")), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      background: 'var(--neo-teal-500)',
      color: '#fff',
      padding: '16px 28px',
      borderRadius: 6,
      fontWeight: 600,
      fontSize: 16,
      textDecoration: 'none',
      whiteSpace: 'nowrap'
    }
  }, "Solicitar or\xE7amento")));
}

// ─── Footer ───────────────────────────────────────────
function Footer() {
  const colTitle = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--neo-fog)',
    marginBottom: 14
  };
  const link = {
    color: 'var(--neo-mist)',
    textDecoration: 'none',
    fontSize: 14,
    display: 'block',
    padding: '4px 0'
  };
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--neo-graphite)',
      color: '#fff',
      padding: '64px 32px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr',
      gap: 48
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-horizontal-color-dark.png?v=6",
    style: {
      height: 38
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'var(--neo-mist)',
      marginTop: 16,
      maxWidth: 320,
      lineHeight: 1.55
    }
  }, "Tecnologia para eventos corporativos. \xC1udio, v\xEDdeo, ilumina\xE7\xE3o e opera\xE7\xE3o confi\xE1vel em S\xE3o Paulo e regi\xF5es.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: colTitle
  }, "Solu\xE7\xF5es"), /*#__PURE__*/React.createElement("a", {
    style: link,
    href: "#"
  }, "\xC1udio"), /*#__PURE__*/React.createElement("a", {
    style: link,
    href: "#"
  }, "V\xEDdeo e LED"), /*#__PURE__*/React.createElement("a", {
    style: link,
    href: "#"
  }, "Ilumina\xE7\xE3o"), /*#__PURE__*/React.createElement("a", {
    style: link,
    href: "#"
  }, "Transmiss\xE3o")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: colTitle
  }, "Empresa"), /*#__PURE__*/React.createElement("a", {
    style: link,
    href: "#"
  }, "Opera\xE7\xE3o"), /*#__PURE__*/React.createElement("a", {
    style: link,
    href: "#"
  }, "Cases"), /*#__PURE__*/React.createElement("a", {
    style: link,
    href: "#"
  }, "Carreiras"), /*#__PURE__*/React.createElement("a", {
    style: link,
    href: "#"
  }, "Contato")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: colTitle
  }, "Contato"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...link,
      fontFamily: 'var(--font-mono)',
      fontSize: 12
    }
  }, "contato@neostore.com.br"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...link,
      fontFamily: 'var(--font-mono)',
      fontSize: 12
    }
  }, "+55 11 0000 0000"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...link,
      fontSize: 12
    }
  }, "S\xE3o Paulo \xB7 SP"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 48,
      paddingTop: 24,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: 11,
      color: 'var(--neo-fog)',
      fontFamily: 'var(--font-mono)'
    }
  }, /*#__PURE__*/React.createElement("div", null, "\xA9 neostore tecnologia para eventos \xB7 2007\u20132026"), /*#__PURE__*/React.createElement("div", null, "CNPJ 00.000.000/0001-00"))));
}
Object.assign(window, {
  Header,
  Hero,
  Services,
  Stats,
  Process,
  CTABand,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/components.jsx", error: String((e && e.message) || e) }); }

})();
