import { useState } from 'react';

const cards = [
    {
        id: 1,
        title: 'TRANSPARENT\nBOOKING',
        desc: 'No hidden fees. No surprises. See real-time availability and exact pricing before you commit. Every venue, every slot, every rate — laid out with total clarity.',
        color: 'dark',
        counter: '01 / 04',
    },
    {
        id: 2,
        title: 'SEAMLESS\nCOORDINATION',
        desc: 'Captains, players, and venue owners stay aligned through built-in messaging, automated reminders, and shared calendars. One platform. Zero confusion.',
        color: 'teal',
        counter: '02 / 04',
    },
    {
        id: 3,
        title: 'TRUST &\nSECURITY',
        desc: 'Payments are escrow-protected and instantly confirmed. Owners get guaranteed revenue. Players get peace of mind. Disputes handled fairly and fast.',
        color: 'coral',
        counter: '03 / 04',
    },
    {
        id: 4,
        title: 'VELOCITY\nWINS',
        desc: 'From discovery to booking confirmation in under 60 seconds. No phone calls. No back-and-forth. Just find a slot, gather your squad, and hit the court.',
        color: 'light',
        counter: '04 / 04',
    },
];

const Visuals = {
    dark: (
        <svg viewBox="0 0 300 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', maxWidth: 260 }}>
            {[...Array(18)].map((_, row) =>
                [...Array(14)].map((_, col) => {
                    const cx = 20 + col * 20;
                    const cy = 20 + row * 18;
                    const dist = Math.sqrt((cx - 150) ** 2 + (cy - 160) ** 2);
                    const opacity = Math.max(0.15, 1 - dist / 180);
                    return (
                        <circle key={`${row}-${col}`} cx={cx} cy={cy} r={1.8} fill="rgba(255,255,255,0.85)" opacity={opacity} />
                    );
                })
            )}
        </svg>
    ),
    teal: (
        <svg viewBox="0 0 300 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', maxWidth: 260 }}>
            {[...Array(35)].map((_, i) => (
                <path key={i} d={`M 10 ${160 + Math.sin(i * 0.25) * 100} Q 150 ${160 + Math.cos(i * 0.2) * 140} 290 ${160 + Math.sin(i * 0.3) * 100}`}
                    stroke="rgba(10,10,18,0.35)" strokeWidth="1.2" fill="none" />
            ))}
            {[...Array(80)].map((_, i) => {
                const x = 30 + (i % 10) * 25;
                const y = 40 + Math.floor(i / 10) * 30 + Math.sin(i * 0.5) * 12;
                return <circle key={`d-${i}`} cx={x} cy={y} r={2} fill="rgba(10,10,18,0.4)" />;
            })}
        </svg>
    ),
    coral: (
        <svg viewBox="0 0 300 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', maxWidth: 260 }}>
            {[...Array(28)].map((_, i) => {
                const angle = (i * 13 * Math.PI) / 180;
                return (
                    <line key={i} x1={150} y1={160} x2={150 + Math.cos(angle) * 140} y2={160 + Math.sin(angle) * 140}
                        stroke="rgba(10,10,18,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
                );
            })}
            {[...Array(6)].map((_, ring) => (
                <circle key={ring} cx={150} cy={160} r={20 + ring * 22} stroke="rgba(10,10,18,0.15)" strokeWidth="1" fill="none" />
            ))}
        </svg>
    ),
    light: (
        <svg viewBox="0 0 300 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', maxWidth: 260 }}>
            {[...Array(25)].map((_, i) => (
                <ellipse key={i} cx={150} cy={160} rx={50 + i * 6} ry={28 + i * 5}
                    stroke="rgba(10,10,18,0.12)" strokeWidth="1" fill="none" transform={`rotate(${i * 8} 150 160)`} />
            ))}
            {[...Array(10)].map((_, i) => (
                <circle key={`c-${i}`} cx={80 + i * 15} cy={80 + Math.cos(i) * 50} r={3} fill="rgba(10,10,18,0.18)" />
            ))}
        </svg>
    ),
};

export default function EthosSection() {
    const [hovered, setHovered] = useState(null);

    return (
        <section className="ah-ethos-wqf" id="ethos">
            {/* Header */}
            <div className="ah-ethos-header">
                <div className="ah-ethos-header-left">
                    <p className="ah-ethos-eyebrow">Our Ethos</p>
                    <h2 className="ah-ethos-h2">
                        Vision matters.
                        <br />
                        <em>Velocity wins.</em>
                    </h2>
                </div>
                <div className="ah-ethos-header-right">
                    <p className="ah-ethos-desc">
                        Sports runs on scheduling and trust. We keep the interface calm and
                        the workflow fast — so you spend less time coordinating and more time
                        playing. This isn't just a booking tool. It's complete sports
                        infrastructure, at the speed your team demands.
                    </p>
                    <a href="#features" className="ah-bracket-btn-wqf">
                        <span className="bracket-tl" />
                        <span className="bracket-tr" />
                        <span className="bracket-bl" />
                        <span className="bracket-br" />
                        <span className="ah-bracket-label">Explore Features</span>
                    </a>
                </div>
            </div>

            {/* Horizontal Expand Cards */}
            <div className="ah-expand-row">
                {cards.map((card) => {
                    const isHovered = hovered === card.id;
                    const isOtherHovered = hovered !== null && hovered !== card.id;

                    return (
                        <div
                            key={card.id}
                            className={`ah-expand-card ah-expand-${card.color} ${isHovered ? 'is-hovered' : ''} ${isOtherHovered ? 'is-sibling' : ''}`}
                            onMouseEnter={() => setHovered(card.id)}
                            onMouseLeave={() => setHovered(null)}
                        >
                            <div className="ah-expand-inner">
                                <h3 className="ah-expand-title">{card.title}</h3>
                                <div className="ah-expand-visual">{Visuals[card.color]}</div>
                                <div className="ah-expand-footer">
                                    <span className="ah-expand-counter">{card.counter}</span>
                                    <p className="ah-expand-body">{card.desc}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}