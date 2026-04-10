import { useState } from 'react';
import CreateSession from '../components/CreateSession';
import JoinSession from '../components/JoinSession';

export default function Home({ navigation }) {
  const [mode, setMode] = useState('create');
  const [createdSession, setCreatedSession] = useState(null);

  return (
    <main className="page-shell min-h-screen px-4 py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="vault-panel rounded-[40px] p-8 shadow-vault lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_320px] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vault-muted">
                Private rooms for text and files
              </p>
              <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight text-vault-text lg:text-6xl">
                VaultChat
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-vault-muted">
                A calmer, simpler room experience for temporary conversations. Create a private room, share a QR invite,
                and exchange text, PDFs, images, and voice notes with end-to-end encryption.
              </p>
            </div>

            <div className="rounded-[32px] border border-vault-border bg-vault-surface p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">What changed</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-vault-text">
                <li>Text-first room layout with stronger attachment handling.</li>
                <li>Built-in QR scanning that resolves real room URLs correctly.</li>
                <li>Quantum visualization through a Bloch sphere instead of the old neon pipeline.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="flex w-full justify-center">
          <div className="inline-flex rounded-full border border-vault-border bg-vault-panel p-1 shadow-vault-soft">
            <button
              type="button"
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                mode === 'create' ? 'bg-vault-accent text-white' : 'text-vault-text'
              }`}
              onClick={() => {
                setMode('create');
                setCreatedSession(null);
              }}
            >
              Create room
            </button>
            <button
              type="button"
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                mode === 'join' ? 'bg-vault-accent text-white' : 'text-vault-text'
              }`}
              onClick={() => setMode('join')}
            >
              Join room
            </button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl">
          {mode === 'create' ? (
            <>
              <CreateSession onCreated={(sessionData) => setCreatedSession(sessionData)} />

              {createdSession ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    className="rounded-full bg-vault-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-vault-accentStrong"
                    onClick={() =>
                      navigation.goToRoom(createdSession.sessionId, {
                        sessionRef: createdSession.sessionId,
                        displayName: createdSession.displayName,
                        passcode: createdSession.passcode,
                        creatorSecret: createdSession.creatorSecret,
                        source: 'create',
                        qrPayload: createdSession.qrPayload,
                        shortCode: createdSession.shortCode,
                        entropyString: createdSession.entropyString,
                        qrngSource: createdSession.qrngSource,
                        sessionId: createdSession.sessionId
                      })
                    }
                  >
                    Enter room
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
