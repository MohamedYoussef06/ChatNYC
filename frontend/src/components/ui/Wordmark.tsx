export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`}>
      <span className="wordmark-chat">
        Chat
        <span aria-hidden="true" className="wordmark-rail">
          <svg className="wordmark-train" viewBox="0 0 74 14">
            <path d="M57.6 8.4 74 4.2V14Z" fill="#ffd84d" opacity="0.22" />
            <rect x="0.5" y="1.5" width="27" height="10" rx="1.6" fill="#cfd4da" stroke="#7d8690" strokeWidth="0.8" />
            <path d="M29.5 3.1a1.6 1.6 0 0 1 1.6-1.6h23.4l3.3 3.6v6.4H29.5Z" fill="#cfd4da" stroke="#7d8690" strokeWidth="0.8" />
            <rect x="27.5" y="6" width="2" height="3" fill="#7d8690" />
            <g fill="#1d2733">
              <rect x="3" y="3.4" width="3.6" height="2.8" rx="0.4" />
              <rect x="9" y="3.4" width="3.6" height="2.8" rx="0.4" />
              <rect x="15" y="3.4" width="3.6" height="2.8" rx="0.4" />
              <rect x="21" y="3.4" width="3.6" height="2.8" rx="0.4" />
              <rect x="32" y="3.4" width="3.6" height="2.8" rx="0.4" />
              <rect x="38" y="3.4" width="3.6" height="2.8" rx="0.4" />
              <rect x="44" y="3.4" width="3.6" height="2.8" rx="0.4" />
              <path d="M50 3.4h4.3l2.1 2.3v.5H50Z" />
            </g>
            <rect x="0.5" y="7.6" width="57.3" height="1.5" fill="#0039a6" />
            <rect x="1" y="11.6" width="56.5" height="1.2" rx="0.6" fill="#4b535c" />
            <circle cx="56.9" cy="9.9" r="0.9" fill="#fff6c2" />
          </svg>
        </span>
      </span>
      <span className="wordmark-nyc">NYC</span>
    </span>
  );
}
