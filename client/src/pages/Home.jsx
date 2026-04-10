import { useState } from 'react';
import CreateSession from '../components/CreateSession';
import JoinSession from '../components/JoinSession';

export default function Home({ navigation }) {
  const [mode, setMode] = useState('create');
  const [createdSession, setCreatedSession] = useState(null);

  return (
    <main className="page-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:gap-8">
        <section className="vault-panel overflow-hidden rounded-[36px] p-6 shadow-vault sm:p-8 lg:p-12">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_320px] xl:items-end">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-vault-muted">
                Private rooms for text and files
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-vault-text sm:text-5xl lg:text-6xl">
                VaultChat
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-vault-muted">
                A calmer, simpler room experience for temporary conversations. Create a private room, share a QR invite,
                and exchange text, PDFs, images, and voice notes with end-to-end encryption.
              </p>
            </div>

            <div className="rounded-[28px] border border-vault-border bg-vault-surface p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Quantum highlights</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-vault-text">
                <li>ANU QRNG powers session entropy whenever the live quantum source is available.</li>
                <li>Quantum-derived randomness seeds each temporary room before invites are shared.</li>
                <li>The Bloch sphere visualizes entropy as a quantum state with a live vector length shift.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="flex w-full justify-center">
          <div className="inline-flex w-full max-w-md rounded-full border border-vault-border bg-vault-panel p-1 shadow-vault-soft">
            <button
              type="button"
              className={`flex-1 rounded-full px-5 py-2.5 text-sm font-medium transition ${
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
              className={`flex-1 rounded-full px-5 py-2.5 text-sm font-medium transition ${
                mode === 'join' ? 'bg-vault-accent text-white' : 'text-vault-text'
              }`}
              onClick={() => setMode('join')}
            >
              Join room
            </button>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl">
          {mode === 'create' ? (
            <>
              <CreateSession onCreated={(sessionData) => setCreatedSession(sessionData)} />

              {createdSession ? (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    className="w-full max-w-xs rounded-full bg-vault-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-vault-accentStrong"
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
