// Event-driven reads: an abandoned tab must not keep Postgres awake.
export const AUTO_REFRESH_COOLDOWN = 10 * 60 * 1000;
export function createRefreshGate(now = Date.now) {
  let lastAttempt = -Infinity;
  return {
    allow({automatic=false,dirty=false,visible=true,online=true}={}) {
      if(automatic&&(!online||(!dirty&&!visible)))return false;
      const time=now();
      if(automatic&&!dirty&&time-lastAttempt<AUTO_REFRESH_COOLDOWN)return false;
      lastAttempt=time;
      return true;
    },
  };
}
