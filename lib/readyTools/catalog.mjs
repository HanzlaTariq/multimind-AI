/** Public tool definitions. No API keys, provider secrets or executable user code. */
const data = (id, name, icon, description, extra = {}) => ({id,name,icon,description,category:'Data',engine:'local',input:'dataset',...extra});
const ai = (id, name, icon, description, category='Writing',extra={}) => ({id,name,icon,description,category,engine:'ai',input:'text',...extra});
const connect = (id, name, icon, description, service, action, extra={}) => ({id,name,icon,description,category:'Connected tools',engine:'connection',input:'form',service,action,...extra});
export const TOOLS = [
 data('clean-rank','Clean & rank a dataset','ListFilter','Remove duplicates, filter your scores and bring the strongest records to the top.',{featured:true,tags:['CSV','Excel','Ranking'],steps:['Read your data','Clean and deduplicate','Filter and rank','Review & download']}),
 data('remove-duplicates','Duplicate remover','CopyMinus','Keep one clean copy of each record. Review every removed row.',{tags:['Contacts','Cleanup']}),
 data('filter-sort','Filter & sort','ArrowDownWideNarrow','Find matching rows, choose an order and keep just what you need.',{tags:['Search','Sorting']}),
 data('email-cleaner','Email list cleaner','MailCheck','Trim addresses, flag invalid syntax and remove repeated email addresses.',{tags:['Email','Validation'],note:'Syntax checks only. This does not verify that a mailbox exists.'}),
 data('data-summary','Dataset insights','ChartColumn','See missing values and numeric statistics, or group and total a column.',{tags:['Analytics','Totals']}),
 data('column-picker','Column organizer','Columns3','Choose, reorder and rename columns without changing your original file.',{tags:['Columns','Mapping']}),
 data('format-converter','CSV / Excel / JSON converter','FileSpreadsheet','Open a table once and export it as CSV, Excel or JSON.',{tags:['CSV','XLSX','JSON']}),
 {id:'text-cleaner',name:'Text cleaner',icon:'Eraser',description:'Tidy spacing, remove duplicate lines and change letter case.',category:'Productivity',engine:'local',input:'text',tags:['Text','Formatting']},
 {id:'text-stats',name:'Word & text counter',icon:'CaseSensitive',description:'Count words, characters and sentences, and estimate reading time.',category:'Productivity',engine:'local',input:'text',tags:['Words','Reading']},
 {id:'json-formatter',name:'JSON formatter',icon:'Braces',description:'Validate JSON and produce a readable or compact copy with clear error feedback.',category:'Productivity',engine:'local',input:'text',tags:['JSON','Developer']},
 ai('summarizer','Smart summarizer','AlignLeft','Turn long notes into a short, useful summary with key takeaways.','Productivity',{featured:true,tags:['Notes','Summary']}),
 ai('rewrite','Rewrite & polish','PenLine','Improve clarity and tone while keeping the meaning of your text.', 'Writing',{tags:['Tone','Editing']}),
 ai('translate','Translator','Languages','Translate your text into a chosen language without extra setup.','Writing',{tags:['Languages','Translation']}),
 ai('email-draft','Email writer','Mail','Turn your rough message into a polished email. Review it before sending.','Writing',{tags:['Drafts','Business']}),
 ai('social-captions','Social caption studio','Megaphone','Create platform-aware caption options from your topic or product brief.','Marketing',{featured:true,tags:['Captions','Social']}),
 ai('blog-outline','Blog outline builder','NotebookPen','Get a structured outline, working title and introduction from your topic.','Marketing',{tags:['Content','Outline']}),
 ai('meeting-actions','Meeting to action items','ListChecks','Turn a transcript into decisions, tasks and clearly identified owners.','Productivity',{tags:['Meetings','Tasks']}),
 ai('support-reply','Customer reply assistant','MessagesSquare','Draft a helpful reply using the customer message and your policy notes.','Writing',{tags:['Support','Drafts']}),
 connect('sheets-reader','Google Sheets reader','Sheet','Read a connected spreadsheet into a preview table and download a copy.','google',false,{tags:['Google','Import']}),
 connect('gmail-send','Send a Gmail message','Send','Review and send one message from your connected Google account.','google',true,{tags:['Google','Email']}),
 connect('slack-send','Slack notification','MessageSquare','Send a reviewed message to the channel configured by your saved webhook.','slackWebhook',true,{tags:['Slack','Notifications']}),
 connect('discord-send','Discord notification','MessagesSquare','Post a reviewed message using a saved Discord webhook.','discordWebhook',true,{tags:['Discord','Notifications']}),
 connect('telegram-send','Telegram message','Send','Send a reviewed message using your saved bot and destination chat ID.','telegram',true,{tags:['Telegram','Bots']}),
].map(t=>({...t,steps:t.steps||[t.input==='dataset'?'Add your data':t.engine==='connection'?'Choose a connection':'Add your text','Adjust optional settings',t.action?'Review & confirm':'Run the tool','Review your result']}));
export const CATEGORIES=['All tools','Data','Writing','Marketing','Productivity','Connected tools'];
export const getTool=id=>TOOLS.find(t=>t.id===id)||null;
export const LIMITS={fileBytes:5*1024*1024,rows:10000,columns:100,cells:300000,text:30000,cellChars:30000};
export const SAMPLE_ROWS=[
 {name:'Ayesha Khan',email:'ayesha@example.com',score:92,city:'Lahore'},
 {name:'Ali Raza',email:'ali@example.com',score:72,city:'Karachi'},
 {name:' Ayesha Khan ',email:'ayesha@example.com',score:92,city:'Lahore'},
 {name:'Sara Ahmed',email:'sara@example.com',score:45,city:'Islamabad'},
 {name:'Usman Malik',email:'usman@example.com',score:88,city:'Lahore'},
 {name:'Hina Shah',email:'hina@example.com',score:65,city:'Multan'},
];
export const SAMPLE_TEXT={
 'json-formatter':'{"project":"MultiMind","status":"ready","steps":["Upload","Run","Download"]}',
 'meeting-actions':'Project check-in: Sara will prepare the landing page draft by Friday. Ali will test the sign-up flow by Thursday. We agreed to launch a private beta before announcing publicly. No owner was assigned for the help center.',
 'social-captions':'A small tea shop is launching a new cardamom chai. Write for local tea lovers. Do not invent a price or a discount.',
 'email-draft':'Ask the project supervisor for a meeting next week to review our progress. Mention that our first prototype is ready.',
 'blog-outline':'How university students can organize study notes and revision without expensive software.',
 'support-reply':'Customer: I cannot find the download button after running the data cleaner.\nPolicy notes: The download buttons appear above the result table after a successful run.',
 'default':'Good tools remove unnecessary steps. Our team wants visitors to upload their data, run a ready-made tool, and download a useful result. Advanced settings should stay optional, and the original data should remain unchanged.',
};
export const OPTION_KEYS=['duplicateColumn','rankColumn','minScore','limit','direction','trim','ignoreCase','filterColumn','operator','filterValue','emailColumn','groupColumn','valueColumn','columns','renames','removeBlankLines','removeDuplicateLines','letterCase','compact','tone','language','length','audience','platform'];
export function defaultOptions(toolId, rows=[]){
 const cols=Object.keys(rows[0]||{});
 const find=pattern=>cols.find(c=>pattern.test(c))||'';
 return {trim:toolId!=='format-converter',ignoreCase:true,duplicateColumn:find(/^(e[-_ ]?mail|email address)$/i),rankColumn:find(/^(score|rating|points)$/i),minScore:toolId==='clean-rank'&&find(/^(score|rating|points)$/i)?60:'',limit:toolId==='clean-rank'?10:10000,direction:'desc',emailColumn:find(/e[-_ ]?mail/i),filterColumn:'',operator:'contains',filterValue:'',groupColumn:'',valueColumn:'',columns:cols,renames:{},removeBlankLines:true,removeDuplicateLines:false,letterCase:'keep',compact:false,tone:'Professional',language:'English',length:'Concise',audience:'General audience',platform:'Instagram'};
}
