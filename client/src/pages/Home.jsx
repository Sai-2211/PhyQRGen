import { useState } from 'react';
import CreateSession from '../components/CreateSession';
import JoinSession from '../components/JoinSession';

export default function Home({ navigation }) {
  const [mode, setMode] = useState('create');
  const [createdSession, setCreatedSession] = useState(null);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 md:px-8 md:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-15%] h-[280px] w-[280px] rounded-full bg-vault-accent/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-8%] h-[240px] w-[240px] rounded-full bg-vault-accentAlt/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-vault-accent">Ephemeral Quantum Chat</p>
          <h1 className="text-4xl font-semibold tracking-tight text-vault-text md:text-5xl">VaultChat</h1>
          <p className="mx-auto max-w-2xl text-sm text-vault-muted md:text-base">
            Time-locked private rooms with client-side encrypted messages and media. No accounts. No history.
          </p>
        </header>

        <section className="mx-auto flex w-full max-w-md gap-2 rounded-xl border border-vault-accent/25 bg-black/35 p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${
              mode === 'create'
                ? 'bg-vault-accent/20 text-vault-accent'
                : 'text-vault-muted hover:text-vault-text'
            }`}
            onClick={() => setMode('create')}
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

        <section className="mx-auto w-full max-w-2xl">
          {mode === 'create' ? (
            <>
              <CreateSession
                onCreated={(sessionData) => {
                  setCreatedSession(sessionData);
                }}
              />

              {createdSession ? (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    className="rounded-lg border border-vault-accentAlt/45 bg-vault-accentAlt/10 px-5 py-2 text-sm font-medium text-vault-accentAlt hover:bg-vault-accentAlt/20"
                    onClick={() =>
                      navigation.goToRoom(createdSession.sessionId, {
                        sessionRef: createdSession.sessionId,
                        displayName: createdSession.displayName,
                        passcode: createdSession.passcode,
                        creatorSecret: createdSession.creatorSecret,
                        source: 'create'
                      })
                    }
                  >
                    Enter Secure Room
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
