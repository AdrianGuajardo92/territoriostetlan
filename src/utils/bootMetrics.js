const BOOT_SUMMARY_STEPS = [
  ['reactMountMs', 'boot:start', 'boot:react-mounted'],
  ['authResolvedMs', 'boot:start', 'boot:auth-resolved'],
  ['territoriesSnapshotMs', 'boot:start', 'boot:territories-first-snapshot'],
  ['territoriesPaintMs', 'boot:start', 'boot:territories-painted'],
  ['secondaryReadyMs', 'boot:start', 'boot:secondary-ready']
];

const isBrowser = typeof window !== 'undefined';
const isDev = isBrowser && Boolean(import.meta.env?.DEV);

const ensureBootMetricsState = () => {
  if (!isBrowser) return null;

  if (!window.__BOOT_METRICS__) {
    window.__BOOT_METRICS__ = {
      marks: {},
      measures: {},
      logged: false
    };
  }

  return window.__BOOT_METRICS__;
};

export const resetBootMetrics = () => {
  if (!isBrowser) return;

  window.__BOOT_METRICS__ = {
    marks: {},
    measures: {},
    logged: false
  };
};

export const markBoot = (name) => {
  if (!isBrowser) return;

  try {
    performance.mark(name);
  } catch (error) {
    // Ignore duplicated or unsupported marks.
  }

  const state = ensureBootMetricsState();
  if (!state) return;

  state.marks[name] = performance.now();
};

export const measureBoot = (name, startMark, endMark) => {
  if (!isBrowser) return null;

  const state = ensureBootMetricsState();
  if (!state?.marks[startMark] || !state?.marks[endMark]) {
    return null;
  }

  try {
    performance.measure(name, startMark, endMark);
  } catch (error) {
    // Ignore missing marks or unsupported measure API details.
  }

  const entry = performance.getEntriesByName(name).at(-1);
  const duration = entry ? Number(entry.duration.toFixed(2)) : null;

  if (duration != null) {
    state.measures[name] = duration;
  }

  return duration;
};

export const flushBootSummary = () => {
  if (!isDev || !isBrowser) return;

  const state = ensureBootMetricsState();
  if (!state || state.logged) {
    return;
  }

  BOOT_SUMMARY_STEPS.forEach(([measureName, startMark, endMark]) => {
    measureBoot(measureName, startMark, endMark);
  });

  state.logged = true;

  const table = BOOT_SUMMARY_STEPS.reduce((summary, [measureName]) => {
    if (state.measures[measureName] != null) {
      summary[measureName] = `${state.measures[measureName]} ms`;
    }
    return summary;
  }, {});

  if (Object.keys(table).length > 0) {
    console.groupCollapsed('[boot] resumen');
    console.table(table);
    console.groupEnd();
  }
};
