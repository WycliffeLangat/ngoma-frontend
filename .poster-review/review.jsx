import React from 'react';
import { createRoot } from 'react-dom/client';
import { PosterContent as Chart } from '../src/admin/pages/PosterGeneratorPage.jsx';
import { PosterContent as Movers } from '../src/admin/pages/MoversPosterPage.jsx';
import { PosterContent as Cross } from '../src/admin/pages/CrossPlatformPosterPage.jsx';
import { PosterContent as Hall } from '../src/admin/pages/HallOfFamePosterPage.jsx';
import { PosterContent as Compare } from '../src/admin/pages/HeadToHeadPosterPage.jsx';
import { PosterContent as Platform } from '../src/admin/pages/PlatformBreakdownPosterPage.jsx';
import { SpotlightContent as Spotlight } from '../src/admin/pages/SpotlightGeneratorPage.jsx';
import { RecordCardContent as Record } from '../src/admin/pages/AnalyticsRecordPage.jsx';
import { QRPosterContent as QR } from '../src/admin/pages/QRCodePosterPage.jsx';
import { NewsPostContent as News, VideoPostContent as Video, DEFAULT_NEWS_DESIGN, DEFAULT_VIDEO_DESIGN } from '../src/admin/pages/NewsCardPage.jsx';
import Certification from '../src/components/sharePosters/CertificationSharePoster.jsx';
import Share from '../src/components/SharePosterCard.jsx';
import Detail from '../src/components/sharePosters/DetailListPoster.jsx';
import Graph from '../src/components/sharePosters/DetailChartPoster.jsx';
import { exportNodeAsPng } from '../src/admin/utils/exportPoster.jsx';
const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><defs><linearGradient id="g"><stop stop-color="#657D96"/><stop offset="1" stop-color="#D2AC81"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#g)"/><circle cx="540" cy="480" r="250" fill="#243C50"/><path d="M100 1350Q120 720 540 720T1000 1350" fill="#314C65"/></svg>');
const rows = Array.from({length:20},(_,i)=>({rank:i+1,r:i+1,title:i%3 ? 'Nairobi Nights' : 'A Longer Release Title for the Weekend',t:'Nairobi Nights',subtitle:'Artist One feat. Artist Two',artist:'Artist One',a:'Artist One',image,cover_image:image,monthsOnChart:12,peakRank:1,peakStreak:3,movement:'up',delta:12,platforms:4,hofMonths:['August 2026'],value:125,label:'Spotify'}));
const item={...rows[0],title:'Nairobi Nights',subtitle:'Artist One feat. Artist Two',certifications:['gold'],level:'gold',points:150000,certifiedDate:'September 2026',currentRank:1,secondaryStatLabel:'Platforms',secondaryStatValue:5};
const profile={...item,totalPts:150000,peak:1,avgRank:3,months:12,numberOnes:4,platformCount:5,monthly:{'August 2026':{rank:1},'September 2026':{rank:3}}};
const common={chartType:'singles',period:'monthly',platform:'Combined',month:'September 2026',accentColor:'#BF870E',countryLabel:'Kenya'};
const fixtures=[
 ['chart5',Chart,{...common,rows:rows.slice(0,5)}],['chart10',Chart,{...common,rows:rows.slice(0,10)}],['chart20',Chart,{...common,rows}],
 ['movers',Movers,{...common,rows:rows.slice(0,10),move:'risers'}],['cross',Cross,{...common,rows:rows.slice(0,10),mode:'reach'}],
 ['hall',Hall,{...common,items:rows.slice(0,8)}],['compare',Compare,{...common,profile1:profile,profile2:profile,months:['August 2026','September 2026']}],
 ['platform',Platform,{...common,rows:rows.slice(0,5),metric:'points',viewMode:'table'}],
 ['spotlight',Spotlight,{item,type:'singles'}],['record',Record,{...common,item,recordType:'most-points',recordLabel:'Most chart points'}],
 ['certification',Certification,{item}],['share',Share,{...item,stats:[{label:'Peak rank',value:'#1'},{label:'Total points',value:'150,000'},{label:'Months charted',value:12},{label:'Platforms',value:5}]}],
 ['detail',Detail,{...item,sectionLabel:'Chart history',columns:[{label:'Month'},{label:'Rank'},{label:'Points'}],rows:Array.from({length:12},()=>['September 2026','#1','150,000'])}],
 ['graph',Graph,{...item,sectionLabel:'Chart performance',charts:[{label:'Monthly points',kind:'bar',data:[{month:'Aug',points:3000},{month:'Sep',points:5000}],xKey:'month',dataKey:'points'}]}],
 ['qr',QR,{...common,title:'Discover the official charts',subtitle:'Scan to explore Kenya’s biggest songs and artists.',cta:'Explore Ngoma Charts',destination:'https://ngomacharts.com',qrBackground:'#fff'}],
 ['news',News,{design:{...DEFAULT_NEWS_DESIGN,image,headline:'Nairobi artists take over the charts this week',subheadline:'A new generation of artists is making its mark.'}}],
 ['video',Video,{design:{...DEFAULT_VIDEO_DESIGN,videoFrame:image,title:'Nairobi Nights',artist:'Artist One'}}]
];
const query=new URLSearchParams(location.search);const theme=query.get('theme')||'dark';
createRoot(document.getElementById('root')).render(<>{fixtures.filter(([name])=>!query.get('name')||name===query.get('name')).map(([name,Component,props])=><section key={name} data-fixture={name}><Component {...props} theme={theme}/></section>)}</>);
window.exportReview = () => exportNodeAsPng(document.querySelector('section > div'),'poster-review.png');
