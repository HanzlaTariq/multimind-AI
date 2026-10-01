import mongoose from 'mongoose';
const schema=new mongoose.Schema({_id:String,owner:String,lockUntil:{type:Date,default:()=>new Date(0)}});
export default mongoose.models.ReadyToolGate||mongoose.model('ReadyToolGate',schema);
