import endminImg from '../../assets/img/endmin_thumbsup_640px.webp';

export default function AboutTab() {
  return (
    <div className='ef-module-page ef-about-view'>
      <section className='ef-about-intro'>
        <div className='ef-about-copy'>
          <span className='ef-record-kicker'>ARCHIVE DOSSIER // 0001</span>
          <h2>Independent field<br /><em>data archive.</em></h2>
          <p>This interface presents records collected by the Endfield repository: API changes, package manifests, and selected binary assets for game data research.</p>
          <a className='ef-repository-link' href='https://github.com/horoyoi-san/Endfield' target='_blank' rel='noreferrer'>OPEN PROJECT REPOSITORY <span>↗</span></a>
        </div>
        <img id='endmin-thumbsup' src={endminImg} alt='Endmin Thumbs Up' />
      </section>
      <div className='ef-about-grid'>
        <section className='ef-about-card'>
          <div className='ef-about-card-head'><span>01</span><h3>Project scope</h3></div>
          <p>The archive automatically records selected Arknights: Endfield API changes, packages, and raw data. It is intended for users researching and analyzing game data.</p>
          <div className='ef-about-meta'>SOURCE <strong>HOROYOI-SAN / ENDFIELD</strong></div>
        </section>
        <section className='ef-about-card ef-about-warning'>
          <div className='ef-about-card-head'><span>02</span><h3>Disclaimer</h3></div>
          <p>This project is independent and is not affiliated with Hypergryph or GRYPHLINE. It is provided for private, educational, and research purposes.</p>
          <p>All rights to archived API and binary data belong to their respective holders. Use the materials at your own risk.</p>
          <div className='ef-about-meta'>STATUS <strong>UNOFFICIAL ARCHIVE</strong></div>
        </section>
        <section className='ef-about-card ef-about-thanks'>
          <div className='ef-about-card-head'><span>03</span><h3>Field contributors</h3></div>
          <div className='ef-contributor'><strong>Vivi029</strong><span>Windows Google Play Games channel</span><b>CONTRIBUTION LOGGED</b></div>
        </section>
      </div>
    </div>
  );
}
