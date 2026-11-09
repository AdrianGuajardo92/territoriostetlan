import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../common/Icon';
import { CONGREGATION_CIRCUITS, CONGREGATIONS_SOURCE } from '../../data/congregations';
import { copiarAlPortapapeles } from '../../utils/clipboard';

const sourceDateLabel = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
}).format(new Date(`${CONGREGATIONS_SOURCE.checkedOn}T00:00:00Z`));

const normalizeSearch = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const getSearchText = (congregation, circuitId) => normalizeSearch([
  circuitId,
  congregation.name,
  congregation.email
].filter(Boolean).join(' '));

const CongregationCard = ({ congregation, circuitId }) => {
  const [copyState, setCopyState] = useState('idle');
  const emailRef = useRef(null);
  const resetCopyRef = useRef(null);
  const mountedRef = useRef(false);
  const locationSeparator = congregation.name.lastIndexOf('-');
  const name = locationSeparator > 0 ? congregation.name.slice(0, locationSeparator) : congregation.name;
  const location = locationSeparator > 0 ? congregation.name.slice(locationSeparator + 1) : '';
  const isCopied = copyState === 'copied';
  const isCopying = copyState === 'copying';

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(resetCopyRef.current);
    };
  }, []);

  const handleCopyEmail = async () => {
    if (isCopying) return;
    clearTimeout(resetCopyRef.current);
    setCopyState('copying');

    let copied = false;
    try {
      copied = await copiarAlPortapapeles(congregation.email);
    } catch {
      // Si el dispositivo bloquea la copia, el correo sigue seleccionable.
    }
    if (!mountedRef.current) return;

    setCopyState(copied ? 'copied' : 'manual');
    if (copied) {
      resetCopyRef.current = setTimeout(() => setCopyState('idle'), 2500);
    } else if (emailRef.current) {
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(emailRef.current);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-[#DCE3EA] bg-white shadow-[0_4px_16px_rgba(34,55,74,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B9C7D3] hover:shadow-[0_10px_28px_rgba(34,55,74,0.08)] motion-reduce:transform-none">
      <div className="h-1.5 bg-[#22374A]" />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#ECF1F6] text-[#22374A] ring-1 ring-inset ring-[#DCE3EA]">
            <Icon name="building" size={23} aria-hidden="true" />
          </div>
          <span className="rounded-full border border-[#DCE3EA] bg-[#ECF1F6] px-3 py-1 text-xs font-semibold tracking-wide text-[#22374A]">
            {circuitId}
          </span>
        </div>

        <div className="mb-4 mt-3">
          <h5 className="break-words text-lg font-bold leading-snug tracking-tight text-[#233344] sm:text-xl">
            {name}
          </h5>
          {location && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[#526577]">
              <Icon name="mapPin" size={14} className="flex-shrink-0" aria-hidden="true" />
              {location}
            </p>
          )}
        </div>

        <div className="mt-auto">
          <div className="rounded-2xl border border-[#DCE3EA] bg-[#F4F6F9] p-3">
            <p className="mb-1.5 text-xs font-medium text-[#526577]">Correo de la congregación</p>
            <span ref={emailRef} className="block select-all break-all text-sm font-semibold leading-relaxed text-[#233344]">
              {congregation.email}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_48px] gap-2">
            <button
              type="button"
              onClick={handleCopyEmail}
              disabled={isCopying}
              aria-label={`Copiar correo de ${congregation.name}`}
              className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22374A] disabled:cursor-wait disabled:opacity-70 ${
                isCopied
                  ? 'bg-[#355E4C]'
                  : 'bg-[#22374A] shadow-sm hover:bg-[#30485C]'
              }`}
            >
              <Icon name={isCopied ? 'check' : 'copy'} size={17} aria-hidden="true" />
              {isCopied ? 'Copiado' : isCopying ? 'Copiando…' : 'Copiar correo'}
            </button>
            <a
              href={`mailto:${congregation.email}`}
              aria-label={`Escribir a ${congregation.email}`}
              title="Abrir correo"
              className="flex min-h-[48px] items-center justify-center rounded-xl border border-[#DCE3EA] text-[#526577] transition-colors hover:border-[#B9C7D3] hover:bg-[#ECF1F6] hover:text-[#22374A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22374A]"
            >
              <Icon name="mail" size={19} aria-hidden="true" />
            </a>
          </div>
          <span className="sr-only" role="status">{isCopied ? 'Correo copiado al portapapeles.' : ''}</span>
          {copyState === 'manual' && (
            <p className="mt-3 text-xs leading-relaxed text-[#805C20]" role="status">
              No se pudo copiar automáticamente. Selecciona el correo y usa «Copiar».
            </p>
          )}
        </div>
      </div>
    </article>
  );
};

const CongregationsDirectory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCircuit, setSelectedCircuit] = useState('all');

  const visibleCircuits = useMemo(() => {
    const query = normalizeSearch(searchTerm);
    return CONGREGATION_CIRCUITS
      .filter((circuit) => selectedCircuit === 'all' || circuit.id === selectedCircuit)
      .map((circuit) => ({
        ...circuit,
        congregations: circuit.congregations.filter((congregation) => (
          !query || getSearchText(congregation, circuit.id).includes(query)
        ))
      }))
      .filter((circuit) => circuit.congregations.length > 0);
  }, [searchTerm, selectedCircuit]);

  const visibleCount = visibleCircuits.reduce((count, circuit) => count + circuit.congregations.length, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-6 sm:space-y-6">
      <header className="rounded-2xl border border-[#DCE3EA] bg-white p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#22374A] text-white">
            <Icon name="building" size={22} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-bold leading-tight text-[#233344] sm:text-2xl">Congregaciones del territorio de Tetlán Señas</h3>
            <p className="mt-2 text-sm text-[#526577]">
              {CONGREGATIONS_SOURCE.totalCongregations} congregaciones en {CONGREGATION_CIRCUITS.length} circuitos.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 rounded-2xl border border-[#DCE3EA] bg-white p-4 sm:grid-cols-[minmax(0,1fr)_14rem] sm:gap-4 sm:p-5">
        <div className="min-w-0">
          <label htmlFor="congregations-search" className="mb-1.5 block text-sm font-semibold text-[#233344]">
            Buscar congregación
          </label>
          <div className="relative">
            <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#526577]" aria-hidden="true" />
            <input
              id="congregations-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nombre o correo"
              className="min-h-[44px] w-full rounded-xl border border-[#B9C7D3] py-2 pl-10 pr-3 text-base text-[#233344] placeholder:text-[#526577] focus:border-[#22374A] focus:outline-none focus:ring-2 focus:ring-[#DCE3EA] sm:text-sm"
            />
          </div>
        </div>
        <div className="min-w-0">
          <label htmlFor="congregations-circuit" className="mb-1.5 block text-sm font-semibold text-[#233344]">
            Circuito
          </label>
          <select
            id="congregations-circuit"
            value={selectedCircuit}
            onChange={(event) => setSelectedCircuit(event.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-[#B9C7D3] bg-white px-3 py-2 text-base text-[#233344] focus:border-[#22374A] focus:outline-none focus:ring-2 focus:ring-[#DCE3EA] sm:text-sm"
          >
            <option value="all">Todos los circuitos</option>
            {CONGREGATION_CIRCUITS.map((circuit) => (
              <option key={circuit.id} value={circuit.id}>
                {circuit.id} ({circuit.congregations.length})
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm font-medium text-[#526577]" aria-live="polite">
        {visibleCount} de {CONGREGATIONS_SOURCE.totalCongregations} congregaciones
      </p>

      {visibleCount === 0 ? (
        <div className="rounded-2xl border border-[#DCE3EA] bg-white px-4 py-10 text-center">
          <Icon name="searchX" size={34} className="mx-auto text-[#526577]" aria-hidden="true" />
          <p className="mt-3 font-medium text-[#233344]">No hay congregaciones con esos filtros.</p>
          <button
            type="button"
            onClick={() => { setSearchTerm(''); setSelectedCircuit('all'); }}
            className="mt-4 min-h-[44px] rounded-xl bg-[#22374A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#30485C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22374A]"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        visibleCircuits.map((circuit) => (
          <section key={circuit.id} aria-labelledby={`circuit-${circuit.id}`} className="space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[#DCE3EA] pb-2">
              <h4 id={`circuit-${circuit.id}`} className="text-lg font-bold text-[#233344] sm:text-xl">
                Circuito {circuit.id}
              </h4>
              <span className="text-sm text-[#526577]">{circuit.congregations.length} congregaciones</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {circuit.congregations.map((congregation) => (
                <CongregationCard key={`${circuit.id}-${congregation.email}`} congregation={congregation} circuitId={circuit.id} />
              ))}
            </div>
          </section>
        ))
      )}

      <p className="text-xs leading-relaxed text-[#526577]">
        Datos consultados en JW Hub el {sourceDateLabel}.
      </p>
    </div>
  );
};

export default CongregationsDirectory;
