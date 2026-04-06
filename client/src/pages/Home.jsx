import { useState } from 'react';
import CreateSession from '../components/CreateSession';
import JoinSession from '../components/JoinSession';

export default function Home({ navigation }) {
  const [mode, setMode] = useState('create');
  const [createdSession, setCreatedSession] = useState(null);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 md:px-8 md:py-10">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-15%] h-[280px] w-[280px] rounded-full bg-vault-accent/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-8%] h-[240px] w-[240px] rounded-full bg-vault-accentAlt/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)' }} />
      </div>

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-vault-accent">⚛ Ephemeral Quantum Chat</p>
          <h1 className="text-4xl font-semibold tracking-tight text-vault-text md:text-5xl">VaultChat</h1>
          <p className="mx-auto max-w-2xl text-sm text-vault-muted md:text-base">
            Time-locked private rooms powered by{' '}
            <span style={{ color: '#00d4ff', fontWeight: 600 }}>quantum random number generation</span>.
            No accounts. No history. No traces.
          </p>
        </header>

        {/* Tab toggle */}
        <section className="mx-auto flex w-full max-w-md gap-2 rounded-xl border border-vault-accent/25 bg-black/35 p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${
              mode === 'create'
                ? 'bg-vault-accent/20 text-vault-accent'
                : 'text-vault-muted hover:text-vault-text'
            }`}
            onClick={() => {
              setMode('create');
              setCreatedSession(null);
            }}
          >
            Create Session
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${
              mode === 'join'
                ? 'bg-vault-accent/20 text-vault-accent'
                : 'text-vault-muted hover:text-vault-text'
            }`}
            onClick={() => setMode('join')}
          >
            Join Session
          </button>
        </section>

        {/* Main content — wider to fit QuantumProcess */}
        <section className="mx-auto w-full max-w-3xl">
          {mode === 'create' ? (
            <>
              <CreateSession
                onCreated={(sessionData) => {
                  setCreatedSession(sessionData);
                }}
              />

              {createdSession ? (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    style={{
                      padding: '12px 32px',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      border: '1px solid rgba(0,255,136,0.5)',
                      background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,212,255,0.1))',
                      color: '#00ff88',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 0 24px rgba(0,255,136,0.2)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,255,136,0.28), rgba(0,212,255,0.2))';
                      e.currentTarget.style.boxShadow = '0 0 32px rgba(0,255,136,0.35)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,212,255,0.1))';
                      e.currentTarget.style.boxShadow = '0 0 24px rgba(0,255,136,0.2)';
                    }}
                    onClick={() =>
                      navigation.goToRoom(createdSession.sessionId, {
                        sessionRef: createdSession.sessionId,
                        displayName: createdSession.displayName,
                        passcode: createdSession.passcode,
                        creatorSecret: createdSession.creatorSecret,
                        source: 'create',
                        // Pass QR data so host can share it in-room
                        qrPayload: createdSession.qrPayload,
                        shortCode: createdSession.shortCode,
                        entropyString: createdSession.entropyString,
                        qrngSource: createdSession.qrngSource,
                        sessionId: createdSession.sessionId
                      })
                    }
                  >
                    ⚡ Enter Secure Room
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <JoinSession
              onJoin={(joinPayload) => {
                navigation.goToRoom(joinPayload.sessionRef, {
                  ...joinPayload,
                  source: 'join'
                });
              }}
            />
          )}
        </section>
      </div>
    </main>
  );
}
