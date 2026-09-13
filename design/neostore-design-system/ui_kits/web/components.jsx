// Marketing site components — NEOSTORE
// Each component is purely presentational; no state management.

const cssVar = (name) => `var(--${name})`;

// ─── Header ───────────────────────────────────────────
function Header() {
  const linkStyle = {
    color: 'var(--neo-ink)', textDecoration: 'none',
    fontWeight: 500, fontSize: 14, padding: '8px 4px',
  };
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--neo-cloud)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '14px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <img src="../../assets/logo-horizontal-color-transparent.png?v=6"
             alt="neostore" style={{ height: 96 }}/>
        <nav style={{ display: 'flex', gap: 28 }}>
          <a href="#" style={linkStyle}>Soluções</a>
          <a href="#" style={linkStyle}>Operação</a>
          <a href="#" style={linkStyle}>Cases</a>
          <a href="#" style={linkStyle}>Empresa</a>
          <a href="#" style={linkStyle}>Contato</a>
        </nav>
        <a href="#" style={{
          background: 'var(--neo-teal-500)', color: '#fff',
          padding: '10px 18px', borderRadius: 6,
          fontWeight: 600, fontSize: 14, textDecoration: 'none',
        }}>Solicitar orçamento</a>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      background: 'var(--neo-ink)', color: '#fff',
      padding: '96px 32px 120px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', right: -40, bottom: -40,
        opacity: 0.08, pointerEvents: 'none',
      }}>
        <img src="../../assets/logo-vertical-color-transparent.png?v=6"
             style={{ width: 480 }}/>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--neo-teal-300)',
        }}>Tecnologia para eventos · Em operação desde 2007</div>
        <h1 style={{
          fontSize: 72, fontWeight: 800, letterSpacing: '-0.025em',
          lineHeight: 1.05, marginTop: 20, maxWidth: 880,
        }}>Eventos que não podem falhar começam no bastidor.</h1>
        <p style={{
          fontSize: 19, lineHeight: 1.55, marginTop: 24,
          maxWidth: 620, color: 'var(--neo-mist)',
        }}>
          Áudio, vídeo, iluminação e tecnologia para convenções, congressos e
          ativações corporativas. Equipe própria, equipamentos calibrados,
          operação confiável do briefing à desmontagem.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
          <a href="#" style={{
            background: 'var(--neo-teal-500)', color: '#fff',
            padding: '14px 22px', borderRadius: 6, fontWeight: 600,
            fontSize: 15, textDecoration: 'none',
          }}>Solicitar orçamento</a>
          <a href="#" style={{
            background: 'transparent', color: '#fff',
            padding: '14px 22px', borderRadius: 6, fontWeight: 600,
            fontSize: 15, textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.24)',
          }}>Conhecer a operação →</a>
        </div>
      </div>
    </section>
  );
}

// ─── Services grid ────────────────────────────────────
const services = [
  { tag: 'Áudio', title: 'Áudio profissional', body: 'Console digital, linha balanceada, monitoração FOH e palco. Redundância em todos os pontos críticos.', spec: '32 ch · 96kHz · 48V' },
  { tag: 'Vídeo', title: 'Vídeo e LED', body: 'Painéis P2.6 a P3.9, switcher 4K, captação multicâmera e operação dedicada em FOH.', spec: '4K @ 60fps · 3500 nits' },
  { tag: 'Iluminação', title: 'Iluminação cênica', body: 'Moving heads, par LED, ribaltas e mesa DMX. Mapeamento de cena alinhado ao run-of-show.', spec: 'DMX · 16ch · 380W' },
  { tag: 'Transmissão', title: 'Transmissão e streaming', body: 'Encoding broadcast, redundância de internet e operação de transmissão híbrida.', spec: 'H.264/H.265 · multibitrate' },
  { tag: 'Interatividade', title: 'Credenciamento e interatividade', body: 'QR codes, totens, leitura de credenciais, votação e quizzes em tempo real.', spec: 'Web · iOS · Android' },
  { tag: 'Operação', title: 'Equipe técnica em campo', body: 'Coordenadores, operadores e cabistas na escala correta. Ensaio técnico antes do evento.', spec: 'Equipe própria CLT' },
];

function Services() {
  return (
    <section style={{ background: 'var(--neo-paper)', padding: '96px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
          <div>
            <div style={{
              fontSize: 12, fontWeight: 600, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: 'var(--neo-teal-500)',
            }}>Soluções técnicas</div>
            <h2 style={{
              fontSize: 42, fontWeight: 800, letterSpacing: '-0.02em',
              marginTop: 12, maxWidth: 640, lineHeight: 1.1,
            }}>Áudio, vídeo, iluminação e tecnologia. Em um ritmo só.</h2>
          </div>
          <a href="#" style={{
            color: 'var(--neo-teal-500)', fontWeight: 600,
            fontSize: 14, textDecoration: 'none',
          }}>Catálogo completo →</a>
        </div>
        <div style={{
          display: 'grid', gap: 16,
          gridTemplateColumns: 'repeat(3, 1fr)',
        }}>
          {services.map(s => (
            <div key={s.title} style={{
              background: '#fff', border: '1px solid var(--neo-cloud)',
              borderRadius: 10, padding: 24, display: 'flex',
              flexDirection: 'column', gap: 12,
            }}>
              <span style={{
                alignSelf: 'flex-start',
                background: 'var(--neo-teal-50)', color: 'var(--neo-teal-700)',
                padding: '4px 10px', borderRadius: 4, fontSize: 11,
                fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>{s.tag}</span>
              <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 4 }}>{s.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--neo-steel)' }}>{s.body}</p>
              <div style={{
                marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--neo-cloud)',
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--neo-fog)',
              }}>{s.spec}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Stats ────────────────────────────────────────────
function Stats() {
  const items = [
    { n: '18', u: 'anos', c: 'em operação técnica desde 2007' },
    { n: '1.4k', u: 'eventos', c: 'corporativos entregues' },
    { n: '32', u: 'pessoas', c: 'na equipe técnica fixa' },
    { n: '99.6%', u: 'uptime', c: 'em transmissão e operação' },
  ];
  return (
    <section style={{
      background: 'var(--neo-graphite)', color: '#fff',
      padding: '72px 32px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32,
        }}>
          {items.map(i => (
            <div key={i.c}>
              <div style={{
                fontSize: 64, fontWeight: 800, letterSpacing: '-0.03em',
                lineHeight: 1, color: 'var(--neo-teal-300)',
              }}>{i.n}<span style={{
                fontSize: 18, fontWeight: 600, color: 'var(--neo-mist)', marginLeft: 6,
              }}>{i.u}</span></div>
              <div style={{
                fontSize: 13, color: 'var(--neo-mist)', marginTop: 12,
                paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)',
              }}>{i.c}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Process ──────────────────────────────────────────
function Process() {
  const steps = [
    { t: 'Briefing técnico', d: 'Levantamento de público, formato, escopo e cronograma. Pré-visita quando necessário.' },
    { t: 'Plano de operação', d: 'Lista de equipamentos, rider técnico, run-of-show, escala de equipe e plano de contingência.' },
    { t: 'Pré-produção', d: 'Testes de bancada, calibração de painéis, ensaio técnico com cliente uma semana antes.' },
    { t: 'Execução em campo', d: 'Montagem, operação ao vivo, FOH dedicado, suporte por rádio com a equipe da produção.' },
    { t: 'Desmontagem e RDO', d: 'Desmontagem organizada, devolução do espaço e relatório de operação no dia seguinte.' },
  ];
  return (
    <section style={{ padding: '96px 32px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--neo-teal-500)',
        }}>Operação</div>
        <h2 style={{
          fontSize: 42, fontWeight: 800, letterSpacing: '-0.02em',
          marginTop: 12, maxWidth: 720, lineHeight: 1.1,
        }}>Do planejamento à desmontagem, no mesmo ritmo.</h2>
        <ol style={{ listStyle: 'none', padding: 0, margin: '48px 0 0', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {steps.map((s, i) => (
            <li key={s.t} style={{
              display: 'grid', gridTemplateColumns: '64px 1fr',
              gap: 24, padding: '24px 0',
              borderBottom: i < steps.length - 1 ? '1px solid var(--neo-cloud)' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 13,
                color: 'var(--neo-teal-500)', fontWeight: 600,
              }}>0{i+1}</div>
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{s.t}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--neo-steel)', marginTop: 6, maxWidth: 720 }}>{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ─── CTA band ─────────────────────────────────────────
function CTABand() {
  return (
    <section style={{
      background: 'var(--neo-ink)', color: '#fff',
      padding: '64px 32px',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40,
      }}>
        <div>
          <h2 style={{
            fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1,
          }}>Tem um evento que não pode falhar?</h2>
          <p style={{ fontSize: 16, color: 'var(--neo-mist)', marginTop: 10 }}>
            Mande o briefing técnico. Retornamos com o plano de operação em até 48h.
          </p>
        </div>
        <a href="#" style={{
          background: 'var(--neo-teal-500)', color: '#fff',
          padding: '16px 28px', borderRadius: 6, fontWeight: 600,
          fontSize: 16, textDecoration: 'none', whiteSpace: 'nowrap',
        }}>Solicitar orçamento</a>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────
function Footer() {
  const colTitle = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.16em',
    textTransform: 'uppercase', color: 'var(--neo-fog)', marginBottom: 14,
  };
  const link = { color: 'var(--neo-mist)', textDecoration: 'none', fontSize: 14, display: 'block', padding: '4px 0' };
  return (
    <footer style={{
      background: 'var(--neo-graphite)', color: '#fff',
      padding: '64px 32px 32px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48,
        }}>
          <div>
            <img src="../../assets/logo-horizontal-color-dark.png?v=6"
                 style={{ height: 38 }}/>
            <p style={{ fontSize: 13, color: 'var(--neo-mist)', marginTop: 16, maxWidth: 320, lineHeight: 1.55 }}>
              Tecnologia para eventos corporativos. Áudio, vídeo, iluminação e
              operação confiável em São Paulo e regiões.
            </p>
          </div>
          <div>
            <div style={colTitle}>Soluções</div>
            <a style={link} href="#">Áudio</a>
            <a style={link} href="#">Vídeo e LED</a>
            <a style={link} href="#">Iluminação</a>
            <a style={link} href="#">Transmissão</a>
          </div>
          <div>
            <div style={colTitle}>Empresa</div>
            <a style={link} href="#">Operação</a>
            <a style={link} href="#">Cases</a>
            <a style={link} href="#">Carreiras</a>
            <a style={link} href="#">Contato</a>
          </div>
          <div>
            <div style={colTitle}>Contato</div>
            <div style={{ ...link, fontFamily: 'var(--font-mono)', fontSize: 12 }}>contato@neostore.com.br</div>
            <div style={{ ...link, fontFamily: 'var(--font-mono)', fontSize: 12 }}>+55 11 0000 0000</div>
            <div style={{ ...link, fontSize: 12 }}>São Paulo · SP</div>
          </div>
        </div>
        <div style={{
          marginTop: 48, paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'var(--neo-fog)',
          fontFamily: 'var(--font-mono)',
        }}>
          <div>© neostore tecnologia para eventos · 2007–2026</div>
          <div>CNPJ 00.000.000/0001-00</div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Header, Hero, Services, Stats, Process, CTABand, Footer });
