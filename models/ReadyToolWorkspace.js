import mongoose from 'mongoose';
const preset=new mongoose.Schema({id:{type:String,required:true},toolId:{type:String,required:true},name:{type:String,maxlength:60},options:{type:mongoose.Schema.Types.Mixed,default:{}},createdAt:{type:Date,default:Date.now}},{_id:false});
const recent=new mongoose.Schema({id:String,toolId:String,status:{type:String,enum:['success','failed','uncertain']},rows:Number,durationMs:Number,createdAt:{type:Date,default:Date.now}},{_id:false});
const schema=new mongoose.Schema({
 user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,unique:true},
 favorites:{type:[String],default:[]},presets:{type:[preset],default:[]},recent:{type:[recent],default:[]},
 preferences:{rememberActivity:{type:Boolean,default:true},defaultExport:{type:String,enum:['csv','xlsx','json'],default:'csv'}}
},{timestamps:true});
export default mongoose.models.ReadyToolWorkspace||mongoose.model('ReadyToolWorkspace',schema);
