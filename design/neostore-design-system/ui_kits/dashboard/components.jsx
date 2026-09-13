// Internal operations dashboard — NEOSTORE
// Layout: sidebar + main with KPI strip + events table

function Sidebar() {
  const item = (active) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
    color: active ? '#fff' : 'var(--neo-mist)',
    background: active ? 'rgba(31,110,120,0.18)' : 'transparent',
    cursor: 'pointer',
  });
  const ico = { width: 18, height: 18, stroke: 'currentColor', strokeWidth: 1.75, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <aside style={{
      width: 240, background: 'var(--neo-ink)', color: '#fff',
      padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 4,
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ padding: '8px 10px 18px' }}>
        <img src="../../assets/logo-horizontal-color-dark.png?v=5" style={{ height: 60, maxWidth: '100%', objectFit: 'contain' }}/>
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neo-fog)', padding: '12px 14px 6px' }}>Operação</div>
      <div style={item(true)}>
        <svg viewBox="0 0 24 24" style={ico}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        Visão geral
      </div>
      <div style={item()}>
        <svg viewBox="0 0 24 24" style={ico}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Eventos
      </div>
      <div style={item()}>
        <svg viewBox="0 0 24 24" style={ico}><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M8 22h8"/></svg>
        Equipamentos
      </div>
      <div style={item()}>
        <svg viewBox="0 0 24 24" style={ico}><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>
        Equipe
      </div>
      <div style={item()}>
        <svg viewBox="0 0 24 24" style={ico}><path d="M5 18H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v11"/><path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
        Logística
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neo-fog)', padding: '20px 14px 6px' }}>Comercial</div>
      <div style={item()}>
        <svg viewBox="0 0 24 24" style={ico}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Propostas
      </div>
      <div style={item()}>
        <svg viewBox="0 0 24 24" style={ico}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Clientes
      </div>
    </aside>
  );
}

function Topbar() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 28px', borderBottom: '1px solid var(--neo-cloud)',
      background: '#fff',
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--neo-fog)' }}>Operação</div>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.015em', marginTop: 2 }}>Visão geral · semana 19</div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <input placeholder="Buscar evento, equipamento, cliente…" style={{
          font: '400 13px var(--font-sans)', padding: '9px 14px',
          border: '1px solid var(--neo-mist)', borderRadius: 6,
          width: 320,
        }}/>
        <button style={{
          background: 'var(--neo-teal-500)', color: '#fff',
          padding: '9px 16px', borderRadius: 6, border: 0,
          fontWeight: 600, fontSize: 13, cursor: 'pointer',
        }}>+ Novo evento</button>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--neo-purple-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>RS</div>
      </div>
    </div>
  );
}

function KPIs() {
  const items = [
    { label: 'Eventos ativos', value: '8', delta: '+2 vs sem. ant.', tone: 'teal' },
    { label: 'Equipamento em rota', value: '142', delta: 'unidades', tone: 'neutral' },
    { label: 'Equipe escalada', value: '24', delta: '/ 32 disponíveis', tone: 'neutral' },
    { label: 'Uptime · 30d', value: '99.6%', delta: 'Sem incidentes críticos', tone: 'success' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {items.map(k => (
        <div key={k.label} style={{
          background: '#fff', border: '1px solid var(--neo-cloud)',
          borderRadius: 10, padding: 18,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--neo-fog)' }}>{k.label}</div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', marginTop: 8, color: k.tone === 'teal' ? 'var(--neo-teal-500)' : k.tone === 'success' ? 'var(--neo-success)' : 'var(--neo-ink)' }}>{k.value}</div>
          <div style={{ fontSize: 12, color: 'var(--neo-steel)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>{k.delta}</div>
        </div>
      ))}
    </div>
  );
}

function EventsTable() {
  const rows = [
    ['EVT-2241', 'Volutech · Convenção', '14–16 mai', 'Centro de Convenções SP', 'em-operacao', 'Em operação'],
    ['EVT-2242', 'Banco Trion · Town Hall', '15 mai', 'Auditório matriz', 'pre-producao', 'Pré-produção'],
    ['EVT-2243', 'Lab Northgate · Lançamento', '18 mai', 'Hotel Tivoli', 'em-rota', 'Em rota'],
    ['EVT-2244', 'Forium · Painel exec.', '21 mai', 'Estúdio próprio', 'pre-producao', 'Pré-produção'],
    ['EVT-2245', 'Aelio Capital · Roadshow', '24–26 mai', 'Cinco capitais', 'briefing', 'Briefing'],
  ];
  const tone = {
    'em-operacao': { bg: 'rgba(46,143,94,0.12)', dot: '#2E8F5E', fg: '#1F5C3D' },
    'pre-producao': { bg: 'rgba(194,138,30,0.12)', dot: '#C28A1E', fg: '#7A5612' },
    'em-rota': { bg: 'rgba(31,110,120,0.12)', dot: '#1F6E78', fg: '#12454E' },
    'briefing': { bg: 'rgba(140,148,152,0.16)', dot: '#8C9498', fg: '#4A5256' },
  };
  return (
    <div style={{ background: '#fff', border: '1px solid var(--neo-cloud)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--neo-cloud)' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Eventos · próximas 4 semanas</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Todos', 'Em operação', 'Pré-produção', 'Briefing'].map((t, i) => (
            <span key={t} style={{
              padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
              background: i === 0 ? 'var(--neo-ink)' : '#fff',
              color: i === 0 ? '#fff' : 'var(--neo-ink)',
              border: '1px solid ' + (i === 0 ? 'var(--neo-ink)' : 'var(--neo-mist)'),
              cursor: 'pointer',
            }}>{t}</span>
          ))}
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--neo-paper)' }}>
            {['ID', 'Evento', 'Datas', 'Local', 'Status'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '11px 20px', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--neo-fog)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, name, date, loc, statusKey, statusLabel]) => (
            <tr key={id} style={{ borderTop: '1px solid var(--neo-cloud)' }}>
              <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', color: 'var(--neo-steel)' }}>{id}</td>
              <td style={{ padding: '14px 20px', fontWeight: 600 }}>{name}</td>
              <td style={{ padding: '14px 20px', fontFamily: 'var(--font-mono)', color: 'var(--neo-steel)' }}>{date}</td>
              <td style={{ padding: '14px 20px', color: 'var(--neo-steel)' }}>{loc}</td>
              <td style={{ padding: '14px 20px' }}>
                <span style={{
                  display: 'inline-flex', gap: 6, alignItems: 'center',
                  padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: tone[statusKey].bg, color: tone[statusKey].fg,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: tone[statusKey].dot }}/>
                  {statusLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, KPIs, EventsTable });
