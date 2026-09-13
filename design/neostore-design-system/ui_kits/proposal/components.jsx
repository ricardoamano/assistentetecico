// Commercial proposal — NEOSTORE
// PDF-bound A4 pages. Renders one page per <Page> at 794x1123 (A4 @ 96dpi).

function Page({ children, dark }) {
  return (
    <div style={{
      width: 794, minHeight: 1123,
      background: dark ? 'var(--neo-ink)' : '#fff',
      color: dark ? '#fff' : 'var(--neo-ink)',
      margin: '24px auto', position: 'relative',
      boxShadow: '0 14px 32px rgba(14,17,18,0.08)',
      overflow: 'hidden',
    }}>{children}</div>
  );
}

function Cover() {
  return (
    <Page dark>
      <div style={{ position: 'absolute', top: 56, left: 56 }}>
        <img src="../../assets/logo-vertical-color-dark.png?v=5" style={{ height: 60 }}/>
      </div>
      <div style={{
        position: 'absolute', right: -120, bottom: -120,
        opacity: 0.08, pointerEvents: 'none',
      }}>
        <img src="../../assets/logo-vertical-color-dark.png?v=5" style={{ width: 600 }}/>
      </div>
      <div style={{ position: 'absolute', bottom: 96, left: 56, right: 56 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--neo-teal-300)',
        }}>Proposta técnica · #2026-014</div>
        <h1 style={{
          fontSize: 56, fontWeight: 800, letterSpacing: '-0.025em',
          lineHeight: 1.05, marginTop: 16, maxWidth: 580,
        }}>Convenção Anual<br/>Volutech 2026</h1>
        <div style={{
          marginTop: 32, paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.16)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
          fontSize: 13, color: 'var(--neo-mist)',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neo-fog)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cliente</div>
            <div style={{ marginTop: 4, color: '#fff', fontWeight: 600 }}>Volutech S.A.</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neo-fog)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Data prevista</div>
            <div style={{ marginTop: 4, color: '#fff', fontWeight: 600 }}>14–16 mai 2026</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neo-fog)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Local</div>
            <div style={{ marginTop: 4, color: '#fff', fontWeight: 600 }}>Centro de Convenções · SP</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--neo-fog)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Emitida em</div>
            <div style={{ marginTop: 4, color: '#fff', fontWeight: 600 }}>04 mai 2026</div>
          </div>
        </div>
      </div>
    </Page>
  );
}

function PageHeader({ section, page }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '32px 56px 24px', borderBottom: '1px solid var(--neo-cloud)',
      fontFamily: 'var(--font-mono)', fontSize: 10,
      letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--neo-fog)',
    }}>
      <span>NEOSTORE · Volutech 2026</span>
      <span>{section} · pg. {page}</span>
    </div>
  );
}

function Scope() {
  const items = [
    { tag: 'Áudio', title: 'Console digital + linha balanceada', body: 'Console 32ch, monitor in-ear para palco, FOH dedicado.', spec: '32 ch · 96kHz · 48V', qty: '1' },
    { tag: 'Vídeo', title: 'Painel LED principal P2.6', body: '8m × 4.5m, 3500 nits, alimentação redundante.', spec: '4K @ 60fps', qty: '1' },
    { tag: 'Vídeo', title: 'Câmera 4K + switcher', body: 'Captação multicâmera, switcher 4K com gravação.', spec: 'SDI · zoom 30x', qty: '4' },
    { tag: 'Iluminação', title: 'Moving heads + mesa DMX', body: 'Moving heads 380W, par LED, mesa DMX programada.', spec: 'DMX · 16ch', qty: '24' },
    { tag: 'Operação', title: 'Equipe técnica em campo', body: 'Coordenador técnico, FOH áudio + vídeo, cabista, suporte LED.', spec: 'CLT · 3 dias', qty: '8' },
  ];
  return (
    <Page>
      <PageHeader section="Escopo técnico" page="02"/>
      <div style={{ padding: '40px 56px' }}>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--neo-teal-500)',
        }}>02 · Escopo</div>
        <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 12, lineHeight: 1.1 }}>
          O que entregamos no evento
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--neo-steel)', marginTop: 12, maxWidth: 620 }}>
          Linha técnica completa para os 3 dias de convenção, com redundância
          em pontos críticos e equipe própria do briefing à desmontagem.
        </p>

        <div style={{ marginTop: 32, border: '1px solid var(--neo-cloud)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 3fr 2fr 60px',
            padding: '12px 16px', background: 'var(--neo-paper)',
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--neo-fog)',
            fontWeight: 600,
          }}>
            <div>Linha</div><div>Item</div><div>Especificação</div><div style={{ textAlign: 'right' }}>Qtd</div>
          </div>
          {items.map((x, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 3fr 2fr 60px',
              padding: '14px 16px', borderTop: '1px solid var(--neo-cloud)',
              fontSize: 13, alignItems: 'baseline',
            }}>
              <div>
                <span style={{
                  background: 'var(--neo-teal-50)', color: 'var(--neo-teal-700)',
                  padding: '3px 8px', borderRadius: 4, fontSize: 10,
                  fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>{x.tag}</span>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{x.title}</div>
                <div style={{ fontSize: 12, color: 'var(--neo-steel)', marginTop: 2 }}>{x.body}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--neo-steel)' }}>{x.spec}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{x.qty}</div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

function Investment() {
  return (
    <Page>
      <PageHeader section="Investimento" page="03"/>
      <div style={{ padding: '40px 56px' }}>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--neo-teal-500)',
        }}>03 · Investimento</div>
        <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 12, lineHeight: 1.1 }}>
          Investimento por linha
        </h2>
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            ['Áudio', 'R$ 38.400,00'],
            ['Vídeo e LED', 'R$ 84.200,00'],
            ['Iluminação cênica', 'R$ 22.800,00'],
            ['Equipe técnica · 3 dias', 'R$ 28.600,00'],
            ['Logística e montagem', 'R$ 14.000,00'],
          ].map(([k, v], i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '18px 0', borderBottom: '1px solid var(--neo-cloud)',
            }}>
              <span style={{ fontSize: 15 }}>{k}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            padding: '24px 0 0', marginTop: 8,
          }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>Total</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700, color: 'var(--neo-teal-500)', letterSpacing: '-0.02em' }}>R$ 188.000,00</span>
          </div>
        </div>
        <div style={{
          marginTop: 32, padding: 20, background: 'var(--neo-paper)',
          borderLeft: '3px solid var(--neo-teal-500)', borderRadius: 4,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--neo-fog)',
          }}>Condições</div>
          <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: 'var(--neo-steel)' }}>
            <li>50% na assinatura · 50% até 5 dias após o evento</li>
            <li>Validade da proposta: 30 dias</li>
            <li>Inclui ensaio técnico e desmontagem</li>
          </ul>
        </div>
      </div>
    </Page>
  );
}

Object.assign(window, { Page, Cover, Scope, Investment, PageHeader });
