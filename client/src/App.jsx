import { useEffect, useMemo, useState } from 'react';
import Home from './pages/Home';
import Room from './pages/Room';

function parseRoute(pathname) {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  if (cleanPath === '/') {
    return { page: 'home', sessionRef: null };
  }

  if (cleanPath.startsWith('/room/')) {
    const sessionRef = cleanPath.replace('/room/', '').trim();
    return { page: 'room', sessionRef: sessionRef || null };
  }

  return { page: 'home', sessionRef: null };
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  const [roomContext, setRoomContext] = useState({});

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRoute(window.location.pathname));
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigation = useMemo(
    () => ({
      goToRoom(sessionRef, payload = null) {
        if (!sessionRef) {
          return;
        }

        const path = `/room/${sessionRef}`;
        if (payload) {
          setRoomContext((current) => ({
            ...current,
            [sessionRef]: payload
          }));
        }
        window.history.pushState({}, '', path);
        setRoute(parseRoute(path));
      },
      goHome() {
        window.history.pushState({}, '', '/');
        setRoute({ page: 'home', sessionRef: null });
      }
    }),
    []
  );

  if (route.page === 'room' && route.sessionRef) {
    return (
      <Room
        sessionRef={route.sessionRef}
        navigation={navigation}
        initialPayload={roomContext[route.sessionRef] || null}
      />
    );
  }

  return <Home navigation={navigation} />;
}
