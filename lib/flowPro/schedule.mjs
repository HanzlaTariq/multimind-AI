/** Minute resolution calendar scheduling. DST is evaluated through Intl, never a fixed offset. */
export function nextSchedule(config={},after=new Date()){
 const zone=config.timezone||'Asia/Karachi';let formatter;try{formatter=new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});}catch{throw new Error('Invalid IANA timezone');}
 const time=config.time||'09:00';if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Schedule time must be HH:MM');
 const targetDay=String(config.dayOfWeek||'mon').slice(0,3).toLowerCase();if(config.frequency==='weekly'&&!['mon','tue','wed','thu','fri','sat','sun'].includes(targetDay))throw new Error('Invalid day of week');
 const first=Math.floor(new Date(after).getTime()/60000)*60000+60000;
 for(let i=0;i<60*24*8;i++){const date=new Date(first+i*60000);const parts=Object.fromEntries(formatter.formatToParts(date).map(p=>[p.type,p.value]));if(`${parts.hour}:${parts.minute}`===time&&(config.frequency!=='weekly'||parts.weekday.toLowerCase()===targetDay))return date;}
 throw new Error('No matching schedule found in the next eight days');
}
