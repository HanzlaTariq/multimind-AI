const N=(type,label,x,y,config={},extra={})=>({type,position:{x,y},data:{label,config,...extra}});
const template=(id,name,description,category,icon,nodes,edges,extra={})=>({id,name,flowName:name,description,flowDescription:description,category,icon,nodes,edges,accent:'violet',...extra});
export const SAMPLE_LEAD={name:'Ayesha Khan',email:'ayesha@example.com',company:'Orbit Studio',score:86,source:'Website'};
export const PRO_TEMPLATES=[
 template('lead-routing-pro','Smart lead qualification','Clean incoming leads, route by score, and merge the right follow-up.','Sales operations','GitBranch',[
  N('trigger.webhook','Lead received',60,240,{sampleBody:JSON.stringify(SAMPLE_LEAD,null,2)}),
  N('data.set','Normalize lead',380,240,{fields:JSON.stringify({source:"{{ $json.source ?? 'Website' }}",receivedAt:"{{ $run.startedAt }}"}),keepInput:'yes'}),
  N('logic.condition','High-intent lead?',700,240,{field:'score',operator:'gte',value:'70'}),
  N('data.set','Sales-ready',1020,100,{fields:'{"segment":"sales-ready","priority":"high","nextAction":"Book a discovery call"}',keepInput:'yes'}),
  N('data.set','Nurture sequence',1020,420,{fields:'{"segment":"nurture","priority":"normal","nextAction":"Send helpful resources"}',keepInput:'yes'}),
  N('data.merge','Merge follow-up',1340,240,{mode:'object'}),
  N('utility.log','Lead ready',1660,240,{message:'Lead qualified and routed'}),
  N('utility.note','Routing rules',690,-20,{text:'LEAD QUALIFICATION\nScore ≥ 70 → sales team\nScore < 70 → nurture\n\nTest both branches by changing the input score.'}),
 ],[[0,1],[1,2],[2,3,'true'],[2,4,'false'],[3,5],[4,5],[5,6]],{testInput:SAMPLE_LEAD,tags:['Sales','Routing'],difficulty:'Starter',native:true}),
 template('data-cleanup-pro','Clean & rank a dataset','Split records, deduplicate, filter and sort the best matches.','Data processing','Database',[
  N('trigger.manual','Start',60,200),N('data.split','Extract contacts',380,200,{field:'contacts'}),N('data.deduplicate','Unique emails',700,200,{field:'email'}),N('data.filter','Score ≥ 60',1020,200,{field:'score',operator:'gte',value:'60'}),N('data.sort','Rank by score',1340,200,{field:'score',direction:'descending'}),N('data.limit','Top 10',1660,200,{limit:10,offset:0}),
 ],[[0,1],[1,2],[2,3],[3,4],[4,5]],{testInput:{contacts:[{name:'Ayesha',email:'a@example.com',score:92},{name:'Ali',email:'b@example.com',score:72},{name:'Ayesha',email:'a@example.com',score:92},{name:'Sara',email:'c@example.com',score:45}]},native:true,tags:['ETL','Data']}),
 template('api-pipeline-pro','API → transform → report','Fetch from an approved HTTPS API, extract items and generate a count.','API orchestration','Globe',[
  N('trigger.manual','Start',60,200),N('action.http','Fetch data',380,200,{url:'https://api.example.com/v1/items',method:'GET',headers:'{}',body:'{}'}),N('data.split','Get items',700,200,{field:'body.items'}),N('data.aggregate','Total items',1020,200,{operation:'count'}),N('utility.log','Report',1340,200,{message:'API data processed'}),
 ],[[0,1],[1,2],[2,3],[3,4]],{tags:['API','Report'],requires:'Approved HTTPS host'}),
 template('ai-content-pro','AI content review','Generate a structured content draft and prepare it for review.','AI workflows','Brain',[
  N('trigger.manual','Content brief',60,200),N('ai.prompt','Draft with AI',380,200,{systemPrompt:'Create concise marketing content. Return JSON with title, caption, and hashtags.',prompt:'Write a post about {{ $json.topic }}.',outputFormat:'json'},{mockData:{title:'A smarter workday',caption:'Make space for your best work.',hashtags:['productivity','automation']}}),N('data.set','Mark for review',700,200,{fields:'{"reviewStatus":"pending","reviewer":"Marketing team"}',keepInput:'yes'}),N('utility.log','Draft prepared',1020,200,{message:'Review manually before publishing'}),
 ],[[0,1],[1,2],[2,3]],{testInput:{topic:'a new productivity workspace'},tags:['AI','Content'],requires:'Text AI provider'}),
 template('support-routing-pro','Support ticket router','Route incoming tickets to urgent, normal or fallback paths.','Customer support','MessagesSquare',[
  N('trigger.webhook','Ticket received',60,200,{sampleBody:'{"priority":"high","subject":"Payment issue"}'}),N('logic.switch','Ticket priority',380,200,{field:'priority',cases:'{"urgent":"high","normal":"medium"}'}),N('data.set','Escalate now',700,20,{fields:'{"queue":"urgent","slaMinutes":15}',keepInput:'yes'}),N('data.set','Standard queue',700,240,{fields:'{"queue":"standard","slaMinutes":120}',keepInput:'yes'}),N('data.set','Triage queue',700,460,{fields:'{"queue":"triage","slaMinutes":240}',keepInput:'yes'}),N('data.merge','Assigned ticket',1020,240,{mode:'object'}),
 ],[[0,1],[1,2,'urgent'],[1,3,'normal'],[1,4,'default'],[2,5],[3,5],[4,5]],{testInput:{priority:'high',subject:'Payment issue'},tags:['Support','Switch'],native:true}),
 template('error-recovery-pro','Error recovery pattern','Validate input, handle failures through an error output, and record the outcome.','Reliability','ShieldCheck',[
  N('trigger.manual','Start',60,200),N('logic.assert','Validate contact',380,200,{fields:'name,email'},{settings:{onError:'branch',retries:0}}),N('utility.log','Valid contact',700,80,{message:'All required fields found'}),N('data.set','Capture error',700,380,{fields:'{"status":"needs-review","reason":"{{ $json.error }}"}',keepInput:'yes'}),N('data.merge','Outcome',1020,200,{mode:'object'}),
 ],[[0,1],[1,2,'out'],[1,3,'error'],[2,4],[3,4]],{testInput:{name:'Sample contact'},tags:['Errors','Reliability'],native:true}),
 template('item-transform-pro','Map & summarize orders','Transform each order and calculate the total order value.','Data processing','Repeat',[
  N('trigger.manual','Orders received',60,200),N('data.split','Order items',380,200,{field:'orders'}),N('data.map','Normalize orders',700,200,{fields:'{"id":"{{ $item.id }}","amount":"{{ $item.total }}","currency":"USD"}'}),N('data.aggregate','Revenue total',1020,200,{operation:'sum',field:'amount'}),
 ],[[0,1],[1,2],[2,3]],{testInput:{orders:[{id:'ORD-001',total:120},{id:'ORD-002',total:249},{id:'ORD-003',total:89}]},tags:['Items','Revenue'],native:true}),
 template('team-digest-pro','Scheduled team digest','Create an AI summary and deliver it to a Slack channel.','Team productivity','CalendarClock',[
  N('trigger.schedule','Weekday digest',60,200,{frequency:'weekly',dayOfWeek:'mon',time:'09:00',timezone:'Asia/Karachi'}),N('ai.summarize','Summarize updates',380,200,{text:'{{ $vars.updates }}',words:100}),N('action.slack','Send to Slack',700,200,{text:'Weekly digest: {{ $json }}'}),
 ],[[0,1],[1,2]],{variables:{updates:'Replace this with your team updates or connect an upstream data source.'},tags:['Schedule','Slack'],requires:'AI provider + Slack webhook + cron'}),
 template('notify-multi-pro','Multi-channel notifications','Send the same event to Slack and Discord on parallel branches.','Team productivity','Send',[
  N('trigger.webhook','Event received',60,200,{sampleBody:'{"message":"New signup received"}'}),N('action.slack','Slack notification',380,60,{text:'{{ $json.message }}'}),N('action.discord','Discord notification',380,360,{text:'{{ $json.message }}'}),N('data.merge','Delivery results',700,200,{mode:'append'}),
 ],[[0,1],[0,2],[1,3],[2,3]],{testInput:{message:'New signup received'},tags:['Parallel','Notifications'],requires:'Slack + Discord webhook credentials'}),
];
// Each template instance receives its own stable node and edge IDs.
export function buildProTemplate(template,uid=(prefix,index)=>`${prefix}_${index}_${Math.random().toString(36).slice(2,9)}`){
 const nodes=template.nodes.map((n,i)=>({...structuredClone(n),nodeId:uid('node',i)}));
 const edges=template.edges.map(([source,target,sourceHandle],i)=>({edgeId:uid('edge',i),source:nodes[source].nodeId,target:nodes[target].nodeId,sourceHandle:sourceHandle||null,targetHandle:null}));
 return {nodes,edges,name:template.flowName||template.name,description:template.flowDescription||template.description,variables:template.variables||{},testInput:template.testInput||{},tags:template.tags||[]};
}
