import React, { useCallback } from 'react';

const AddressNavigationButtons = ({
  urls = {},
  containerClassName = '',
  dividerClassName = 'bg-gray-300',
  buttonClassName = '',
  onNavigate = null,
  territoryId = null
}) => {
  const handleNavClick = useCallback((event, url) => {
    if (!url) return;
    event.preventDefault();

    if (window.sessionStorage && territoryId) {
      sessionStorage.setItem('lastTerritoryId', territoryId);
      sessionStorage.setItem('navigationTimestamp', Date.now().toString());
    }

    window.open(url, '_blank', 'noopener,noreferrer');
    onNavigate?.(url);
  }, [onNavigate, territoryId]);

  const modes = [
    { key: 'driving', icon: 'fa-car', title: 'Navegar en coche' },
    { key: 'walking', icon: 'fa-person-walking', title: 'Navegar a pie' },
    { key: 'transit', icon: 'fa-bus', title: 'Navegar en transporte público' }
  ];

  return (
    <div className={`flex items-center rounded-xl p-1 ${containerClassName}`}>
      {modes.map((mode, index) => (
        <React.Fragment key={mode.key}>
          {index > 0 ? <div className={`w-px h-4 mx-1 ${dividerClassName}`} /> : null}
          <button
            type="button"
            onClick={(event) => handleNavClick(event, urls[mode.key])}
            disabled={!urls[mode.key]}
            className={`px-3 py-2 rounded-lg ${buttonClassName} transition-all transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
            title={mode.title}
          >
            <i className={`fas ${mode.icon} text-lg`} />
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default AddressNavigationButtons;
