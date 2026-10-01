import mongoose from 'mongoose';
const schema=new mongoose.Schema({
 _id:{type:String,required:true},user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 key:String,scope:String,reference:String,label:String,status:String,reserved:Number,charged:Number,refunded:Number,expiredUnused:Number,
 uncertain:Boolean,units:[mongoose.Schema.Types.Mixed],createdAt:Date,finishedAt:Date,
},{versionKey:false});
schema.index({user:1,finishedAt:-1});
// Financial metadata only; no prompts, input rows, message recipients, tokens or output content.
export default mongoose.models.AutomationCreditReceipt||mongoose.model('AutomationCreditReceipt',schema);
