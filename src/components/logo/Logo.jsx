import React from 'react';
import TaheriScoutBandImg from '../../assets/images/TaheriScoutImg.png';

export default function Logo() {
  return (
    <div className="logo-main">
      <img src={TaheriScoutBandImg} alt="taheri-image" className="logo-img" />
      <h3 className="logo-text">Taheri Scout Band Group</h3>
    </div>
  );
}
