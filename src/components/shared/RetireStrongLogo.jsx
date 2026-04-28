import React from 'react';

export default function RetireStrongLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Trunk */}
      <rect x="14.5" y="20" width="3" height="10" rx="1.5" fill="#4A9E8E"/>
      {/* Canopy — layered ellipses */}
      <ellipse cx="16" cy="18" rx="8"   ry="5.5" fill="#4A9E8E"/>
      <ellipse cx="16" cy="14" rx="7"   ry="5"   fill="#2D7A70"/>
      <ellipse cx="16" cy="10" rx="5.5" ry="4.5" fill="#4A9E8E"/>
      <ellipse cx="16" cy="7"  rx="4"   ry="4"   fill="#0F5E66"/>
      {/* Person head */}
      <circle cx="16" cy="22" r="2.2" fill="#0F5E66"/>
      {/* Shoulder line */}
      <path d="M12.5 26 Q16 24 19.5 26" stroke="#0F5E66" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
