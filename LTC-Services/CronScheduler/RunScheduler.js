var cron = require('node-cron');

var SchedulerFunction = require('../Service/Scheduler/SchedulerFunction');
var TDSGSTFunction = require('../Service/TDSGST/TDSGSTServices');

//For FA MISC Master Data
 cron.schedule('00 20 * * *',function(){  
    SchedulerFunction.Get_FA_Files_APIFunction();
 });

 //For RMO Master Data
 cron.schedule('30 20 * * *',function(){
    SchedulerFunction.Get_RMO_Files_APIFunction();
});

//For PO Master Data
cron.schedule('00 21 * * *',function(){
   SchedulerFunction.Get_PO_Files_APIFunction();
});

//For TDSGST Master Data
cron.schedule('*/15 * * * *',function(){
   SchedulerFunction.Get_TDSGST_Files_APIFunction();
});

//For COST Master Data
cron.schedule('00 23 * * *',function(){
   SchedulerFunction.Get_PO_Cost_Report_Files_APIFunction();
});

//For COST Update API
var BoEDetails = require('../Service/BoE/BoEFinalService')
cron.schedule('*/20 * * * *', () => {
    BoEDetails.CostAPI();
});

//For TDSGST API
cron.schedule('*/15 * * * *',function(){
   TDSGSTFunction.TDSGST_Scheduler_Function();
});