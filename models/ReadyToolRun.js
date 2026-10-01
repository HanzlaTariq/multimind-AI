import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},requestId:{type:String,required:true},toolId:{type:String,required:true},
 status:{type:String,enum:['running','success','failed','uncertain'],default:'running'},credits:{type:Number,default:0},provider:{type:String,default:''},durationMs:{type:Number,default:0},
 // Raw input, output, recipient and message content are deliberately not stored.
 expiresAt:{type:Date,default:()=>new Date(Date.now()+7*24*60*60*1000)}
},{timestamps:true});
schema.index({user:1,requestId:1},{unique:true});schema.index({user:1,createdAt:-1});schema.index({expiresAt:1},{expireAfterSeconds:0});
export default mongoose.models.ReadyToolRun||mongoose.model('ReadyToolRun',schema);
