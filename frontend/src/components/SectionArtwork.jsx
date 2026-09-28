export default function SectionArtwork({ type = 'dashboard', className = '' }) {
  return <svg className={`section-artwork ${className}`} viewBox="0 0 320 230" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={`art-${type}-tile`} x1="50" y1="20" x2="230" y2="190" gradientUnits="userSpaceOnUse"><stop stopColor="#9A7BFF"/><stop offset="1" stopColor="#5945E8"/></linearGradient>
      <linearGradient id={`art-${type}-wash`} x1="70" y1="20" x2="275" y2="205" gradientUnits="userSpaceOnUse"><stop stopColor="#8D78FF" stopOpacity=".2"/><stop offset="1" stopColor="#8D78FF" stopOpacity="0"/></linearGradient>
      <filter id={`art-${type}-shadow`} x="40" y="20" width="260" height="220" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#352A84" floodOpacity=".14"/></filter>
    </defs>
    <circle cx="164" cy="116" r="100" fill={`url(#art-${type}-wash)`}/>
    <ellipse cx="163" cy="115" rx="133" ry="73" transform="rotate(-22 163 115)" stroke="#9F8DFF" strokeOpacity=".4"/>
    <ellipse cx="163" cy="115" rx="119" ry="87" transform="rotate(38 163 115)" stroke="#9F8DFF" strokeOpacity=".27"/>
    <g filter={`url(#art-${type}-shadow)`}>
      {type === 'login' && <>
        <rect x="56" y="44" width="208" height="143" rx="18" fill="#fff" stroke="#E8E5F5"/>
        <rect x="72" y="60" width="42" height="42" rx="14" fill="#F0EDFF"/><circle cx="93" cy="78" r="9" fill="#9C8AF7"/><path d="M80 96c2-8 8-11 13-11s11 3 13 11" fill="#6B56EA"/>
        <rect x="125" y="66" width="89" height="8" rx="4" fill="#27283B"/><rect x="125" y="81" width="65" height="6" rx="3" fill="#A8A6BA"/>
        <rect x="72" y="119" width="176" height="48" rx="11" fill="#F8F7FC"/><path d="M87 151l21-12 19 7 23-19 19 9 28-15" stroke="#705BEF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="197" cy="121" r="5" fill="#705BEF"/>
      </>}
      {type === 'dashboard' && <>
        <rect x="54" y="40" width="212" height="151" rx="17" fill="#fff" stroke="#E8E5F5"/>
        <rect x="70" y="57" width="78" height="49" rx="10" fill="#F5F2FF"/><rect x="81" y="68" width="34" height="6" rx="3" fill="#A49ABF"/><rect x="81" y="81" width="50" height="13" rx="5" fill="#624DE8"/>
        <rect x="157" y="57" width="91" height="49" rx="10" fill="#F7F9FD"/><path d="M169 91l13-12 13 5 18-17 22 9" stroke="#6B58EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="235" cy="76" r="4" fill="#9C83FF"/>
        <rect x="70" y="119" width="178" height="55" rx="10" fill="#FBFAFE"/><rect x="83" y="146" width="14" height="17" rx="4" fill="#C8BFFF"/><rect x="105" y="135" width="14" height="28" rx="4" fill="#A898FF"/><rect x="127" y="128" width="14" height="35" rx="4" fill="#705BEF"/><rect x="149" y="139" width="14" height="24" rx="4" fill="#B9ACFF"/><rect x="171" y="124" width="14" height="39" rx="4" fill="#8B76F7"/><rect x="193" y="133" width="14" height="30" rx="4" fill="#D5CFFF"/>
      </>}
      {type === 'chat' && <>
        <rect x="57" y="48" width="153" height="52" rx="16" fill="#fff" stroke="#E8E5F5"/><rect x="75" y="65" width="97" height="7" rx="3.5" fill="#C8C3DB"/><rect x="75" y="79" width="72" height="6" rx="3" fill="#E1DEEB"/>
        <path d="M150 115h99a15 15 0 0 1 15 15v28a15 15 0 0 1-15 15h-3l-14 12v-12h-82a15 15 0 0 1-15-15v-28a15 15 0 0 1 15-15Z" fill={`url(#art-${type}-tile)`}/><path d="m176 142 10 10 20-22" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><path d="M220 141h24M220 151h17" stroke="#D8D0FF" strokeWidth="4" strokeLinecap="round"/>
        <path d="m100 123 4 11 11 4-11 4-4 11-4-11-11-4 11-4 4-11Z" fill="#9A82FF"/><path d="m226 43 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="#B5A7FF"/>
      </>}
      {type === 'assessment' && <>
        <rect x="82" y="33" width="154" height="164" rx="18" fill="#fff" stroke="#E8E5F5"/><rect x="127" y="23" width="65" height="25" rx="9" fill="#EDE9FF"/><rect x="105" y="67" width="108" height="8" rx="4" fill="#36344A"/><rect x="105" y="83" width="79" height="6" rx="3" fill="#C2BFD0"/>
        <rect x="103" y="107" width="112" height="23" rx="7" fill="#F7F6FC"/><circle cx="116" cy="118" r="6" fill="#6A55E8"/><path d="m113 118 2 2 4-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="130" y="115" width="69" height="6" rx="3" fill="#AAA6B9"/>
        <rect x="103" y="138" width="112" height="23" rx="7" fill="#F7F6FC"/><circle cx="116" cy="149" r="6" fill="#6A55E8"/><path d="m113 149 2 2 4-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><rect x="130" y="146" width="55" height="6" rx="3" fill="#AAA6B9"/>
        <circle cx="225" cy="155" r="30" fill="#F0EDFF" stroke="#fff" strokeWidth="6"/><path d="M212 155l9 9 17-20" stroke="#6A55E8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      </>}
      {type === 'interview' && <>
        <rect x="54" y="48" width="151" height="85" rx="17" fill="#fff" stroke="#E8E5F5"/><circle cx="82" cy="79" r="14" fill="#EEEAFE"/><path d="M70 104c2-9 7-14 12-14s10 5 12 14" fill="#7A64EF"/><rect x="106" y="68" width="78" height="7" rx="3.5" fill="#4A465D"/><rect x="106" y="83" width="58" height="6" rx="3" fill="#C2BFD0"/><rect x="106" y="96" width="68" height="6" rx="3" fill="#E1DEEB"/>
        <path d="M157 126h83a16 16 0 0 1 16 16v29a16 16 0 0 1-16 16h-48l-18 13v-13h-17a16 16 0 0 1-16-16v-29a16 16 0 0 1 16-16Z" fill={`url(#art-${type}-tile)`}/><path d="M185 153v10a12 12 0 0 0 24 0v-10M197 142v26M188 175h18" stroke="#fff" strokeWidth="4" strokeLinecap="round"/><path d="m231 48 4 10 10 4-10 4-4 10-4-10-10-4 10-4 4-10Z" fill="#9A82FF"/>
      </>}
      {type === 'roadmap' && <>
        <path d="M76 164c36-76 76-89 112-53 23 23 33 8 55-22" stroke="#B6A9FF" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 11"/><path d="M77 165c36-76 76-89 112-53 23 23 33 8 55-22" stroke="#705BEF" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="78" cy="163" r="18" fill="#F0EDFF" stroke="#fff" strokeWidth="6"/><circle cx="151" cy="115" r="18" fill="#E7E2FF" stroke="#fff" strokeWidth="6"/><circle cx="244" cy="89" r="24" fill={`url(#art-${type}-tile)`} stroke="#fff" strokeWidth="7"/><path d="m236 89 6 6 11-13" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="54" y="42" width="92" height="30" rx="10" fill="#fff" stroke="#E8E5F5"/><rect x="66" y="53" width="45" height="6" rx="3" fill="#B8B3C9"/><rect x="66" y="62" width="28" height="4" rx="2" fill="#DDD9E9"/>
      </>}
    </g>
  </svg>;
}
