import mongoose from 'mongoose';
const schema=new mongoose.Schema({flow:{type:mongoose.Schema.Types.ObjectId,ref:'Flow',required:true,index:true},user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},label:{type:String,maxlength:120,default:'Checkpoint'},revision:{type:Number,default:1},snapshot:{type:mongoose.Schema.Types.Mixed,required:true}},{timestamps:true});
schema.index({flow:1,createdAt:-1});
export default mongoose.models.FlowVersion||mongoose.model('FlowVersion',schema);
