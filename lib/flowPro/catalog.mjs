/** Shared, dependency-free node metadata. Never put credentials in config defaults. */
const text = (key, label, defaultValue = '', extra = {}) => ({ key, label, type: 'text', default: defaultValue, ...extra });
const json = (key, label, defaultValue = '{}', extra = {}) => ({ key, label, type: 'json', default: defaultValue, ...extra });
const num = (key, label, value, extra = {}) => ({ key, label, type: 'number', default: value, ...extra });
const select = (key, label, values, value = values[0]) => ({ key, label, type: 'select', default: value, options: values.map(v => typeof v === 'string' ? ({ value:v, label:v }) : v) });
const node = (type, label, category, icon, description, configSchema = [], extra = {}) => ({ type, label, category, icon, description, configSchema, capability: 'native', ...extra });
const httpFields = [text('url', 'HTTPS endpoint', '', { required:true, placeholder:'https://api.example.com/v1/items' }), select('method','Method',['GET','POST','PUT','PATCH','DELETE']), json('headers','Headers (JSON)', '{}', {helpText:'Do not paste secrets here. Use the encrypted credential selector.'}), json('body','Body (JSON)', '{}'), {key:'credentialId', label:'Credential', type:'credential'}, num('timeoutMs','Request timeout (ms)',15000,{min:100,max:30000})];
const aiFields = [text('systemPrompt','System instructions','You are a helpful assistant.',{type:'textarea'}), text('prompt','Prompt','{{ $json }}',{type:'textarea',required:true}), select('outputFormat','Response format',['text','json'])];
export const PRO_CATEGORIES = {
 data:{label:'Data operations',accent:'sky'}, integration:{label:'API & integrations',accent:'orange'}, utility:{label:'Utilities',accent:'slate'}
};
export const PRO_NODES = [
 node('trigger.webhook','Webhook','trigger','Webhook','Receive an authenticated HTTP POST and start a workflow.',[text('sampleBody','Test payload','{"event":"order.created","total":249}',{type:'json'}),text('pathHint','Description','Incoming event')]),
 node('data.set','Edit Fields','data','Braces','Build an object using typed expressions and JSON.',[json('fields','Fields (JSON)','{"name":"{{ $json.name }}"}',{required:true}),select('keepInput','Include input fields',['yes','no'],'yes')]),
 node('data.select','Select Fields','data','ListFilter','Keep or remove specific fields from every item.',[text('fields','Comma-separated fields','name,email'),select('mode','Mode',['keep','remove'])]),
 node('data.parseJson','Parse JSON','data','FileJson','Parse JSON text into structured data.',[text('value','JSON text','{{ $json }}',{type:'textarea'})]),
 node('data.stringify','JSON to Text','data','FileJson','Serialize the input as formatted JSON.',[num('indent','Indentation',2,{min:0,max:4})]),
 node('data.filter','Filter Items','data','Filter','Keep array items that pass a condition.',[text('field','Item field','score'),select('operator','Operator',['gte','gt','lt','lte','equals','notEquals','contains','notEmpty']),text('value','Compare with','70')]),
 node('data.sort','Sort Items','data','ArrowDownUp','Sort array items by a numeric or text field.',[text('field','Sort field','score'),select('direction','Direction',['ascending','descending'],'descending')]),
 node('data.limit','Limit Items','data','ListFilter','Take a slice of an array.',[num('limit','Maximum items',10,{min:0,max:1000}),num('offset','Offset',0,{min:0,max:1000})]),
 node('data.deduplicate','Remove Duplicates','data','CopyMinus','Remove duplicate items using a stable key.',[text('field','Unique field (blank = entire item)','email')]),
 node('data.split','Split Out','data','Split','Pull an array out of a nested field.',[text('field','Array field','items',{required:true})]),
 node('data.batch','Batch Items','data','Layers','Divide an array into bounded groups.',[num('size','Items per batch',10,{min:1,max:100})]),
 node('data.map','Map Items','data','Repeat','Transform every item using safe expressions.',[json('fields','Output object','{"name":"{{ $item.name }}","score":"{{ $item.score }}"}')]),
 node('data.aggregate','Aggregate','data','Sigma','Count, sum, average, minimum or maximum.',[select('operation','Operation',['count','sum','average','min','max']),text('field','Numeric field','total')]),
 node('data.merge','Merge Branches','data','Merge','Join all active inputs without losing branch data.',[select('mode','Merge mode',['append','object','byKey']),text('key','Join key','id',{showIf:{key:'mode',equals:'byKey'}})]),
 node('data.rename','Rename Fields','data','TextCursorInput','Rename object keys with an explicit mapping.',[json('mapping','Old key → new key','{"first_name":"firstName"}')]),
 node('data.text','Text Tools','data','CaseSensitive','Trim, change case, split, join or replace text.',[select('operation','Operation',['trim','uppercase','lowercase','split','join','replace']),text('value','Input','{{ $json }}'),text('separator','Separator / search',','),text('replacement','Replacement','')]),
 node('logic.switch','Switch','logic','Waypoints','Route an input into a named case or fallback.',[text('field','Input field','priority'),json('cases','Cases: output name → match value','{"urgent":"high","normal":"medium"}')]),
 node('logic.stop','Stop & Error','logic','OctagonAlert','Intentionally stop a run with a useful error.',[text('message','Error message','Input did not pass validation')]),
 node('logic.assert','Assert','logic','ShieldCheck','Fail when required fields are missing.',[text('fields','Required fields','email,name')]),
 node('logic.noop','Pass Through','utility','ArrowRight','Forward the input without changing it.'),
 node('utility.log','Inspect Data','utility','Terminal','Record a labeled data checkpoint.',[text('message','Checkpoint label','Checkpoint reached')]),
 node('utility.timestamp','Date & Time','utility','CalendarClock','Add an ISO timestamp to the input.',[text('field','Output field','processedAt')]),
 node('utility.uuid','Generate ID','utility','Fingerprint','Add a random UUID to the input.',[text('field','Output field','id')]),
 node('utility.note','Sticky Note','utility','StickyNote','Document a part of the canvas. Notes never execute.',[text('text','Note','Add context for your team…',{type:'textarea'})]),
 node('action.http','HTTP Request','integration','Globe','Call an approved public HTTPS API.',httpFields,{capability:'connected',external:true}),
 node('action.slack','Slack Webhook','integration','Hash','Send a message through a saved Slack webhook.',[{key:'credentialId',label:'Slack webhook credential',type:'credential',required:true},text('text','Message','{{ $json }}',{type:'textarea',required:true})],{capability:'connected',external:true}),
 node('action.discord','Discord Webhook','integration','MessagesSquare','Send a message through a saved Discord webhook.',[{key:'credentialId',label:'Discord webhook credential',type:'credential',required:true},text('text','Message','{{ $json }}',{type:'textarea',required:true})],{capability:'connected',external:true}),
 node('action.telegram','Telegram Message','integration','Send','Send a bot message to a configured chat.',[{key:'credentialId',label:'Bot-token credential',type:'credential',required:true},text('chatId','Chat ID','',{required:true}),text('text','Message','{{ $json }}',{type:'textarea',required:true})],{capability:'connected',external:true}),
 node('action.email','Send Email','integration','Mail','Send mail through the existing Google connection.',[{key:'connectionId',label:'Google account',type:'connection',platform:'google',required:true},text('to','Recipient','',{required:true}),text('subject','Subject','Workflow notification',{required:true}),text('text','Plain-text message','{{ $json }}',{type:'textarea',required:true})],{capability:'connected',external:true}),
 node('ai.prompt','AI Prompt','ai','Brain','Use a configured MultiMind text provider.',aiFields,{capability:'connected',external:true}),
 node('ai.classify','AI Classifier','ai','Tags','Classify text into one of your allowed labels.',[text('text','Text to classify','{{ $json }}',{type:'textarea',required:true}),text('labels','Labels, comma-separated','positive,neutral,negative',{required:true})],{capability:'connected',external:true}),
 node('ai.summarize','AI Summarizer','ai','AlignLeft','Create a concise summary from structured data or text.',[text('text','Content','{{ $json }}',{type:'textarea',required:true}),num('words','Target words',100,{min:10,max:1000})],{capability:'connected',external:true}),
];
export const OPERATORS = ['equals','notEquals','contains','notContains','gt','gte','lt','lte','notEmpty','isEmpty','isTrue','isFalse'];
export const PLANNED_TYPES = new Set(['trigger.newMessage','ai.generateImage','platform.instagramStory','platform.instagramReply','platform.instagramDm','platform.facebookReply','platform.facebookMessage','platform.whatsappSend','platform.whatsappTemplate','platform.tiktokUpload']);
export const CONNECTED_TYPES = new Set(['trigger.driveNewFile','ai.generateCaption','ai.generateVideoScript','ai.extractStructuredData','platform.instagramPost','platform.facebookPost','action.extractDocument','action.appendToSheet','action.sendEmail',...PRO_NODES.filter(n=>n.external).map(n=>n.type)]);
export function getPorts(node) {
 const type=node.type || node.data?.nodeType;
 const config=node.data?.config || {};
 if(type==='utility.note') return [];
 let ports = type==='logic.condition' ? ['true','false'] : type==='logic.switch' ? [...Object.keys(parseCases(config.cases)), 'default'] : ['out'];
 if(node.data?.settings?.onError==='branch') ports.push('error');
 return [...new Set(ports)];
}
export function parseCases(value) { try { const v=typeof value==='string'?JSON.parse(value):value; return v && !Array.isArray(v) && typeof v==='object'?v:{}; } catch {return {};} }
