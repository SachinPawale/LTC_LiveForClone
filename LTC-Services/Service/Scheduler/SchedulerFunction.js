var datamodel = require('../../Data/DataModel');
var dataaccess = require('../../Data/DataAccess');
var connect = require('../../Data/Connect');
var express = require('express');
var dataconn = require('../../Data/DataConnection');
var router = express.Router();
const Sequelize = require('sequelize');
const excelService = require('../../Common/ExcelFile');
const APIDump = require('./APIDump');
const fs = require('fs')
const path = require('path');
const mailer = require('./../../Common/Mailer')
const transaction = require('./../../Service/Transaction/transaction')
const emailservice = require('./../../Common/EmailService')
const SchedulerEmailConfig = require('./../../Config')
var moment = require('moment');


var routes = function () {

router.route('/Get_PO_Files_API')
.get(function (req, res) {
    APIDump.GetFiles_API('PO')
    .then((result)=>
    {
        console.log('GetFiles_API result',result);
        if(result!='')
        {
            excelService.ExportExcelFile('PO',result.RequestID)
            .then((finalObject)=>{
                console.log('after ExportExcelFile ',finalObject);
                const BoEMasterDetails = datamodel.BoEMasterDetails();
                BoEMasterDetails.destroy({
                        where: {},
                        truncate: true
                })
                .then(() => {
                    //console.log('Bulk data',result);
                    var bulkdata = finalObject;
                    BoEMasterDetails.bulkCreate(bulkdata).then(() => {
                        return BoEMasterDetails.findAll();
                    })
                    .then((result1) => {
                        var filepath = path.join(__dirname + '/../../Upload/PO/ESS_O_'+result.RequestID+'_BIP.xml');
                        if(fs.existsSync(filepath))
                        {    
                            fs.unlink(filepath,(err)=>{
                                if (err) {
                                    console.log("failed to delete local file:"+err);
                                } else {
                                    console.log('successfully deleted local file');                                
                                }
                            });
                        }   
                        var updatevalues={
                            RequestStatus: 'Final Success',
                            APIObject: 'Data saved and files deleted',
                            EndDate:connect.sequelize.fn("NOW")
                            };
                          var param = { RequestId: result.RequestID , Id: result.MasterschedulerdetailsID };
                          
                          dataaccess.Update(datamodel.Masterschedulerdetails(),updatevalues,param);

                          var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'PO Scheduler',
                             Status: 'Success',
                             RequestID: result.RequestID,
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'PO Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('into notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                                console.log(err);
                                let mailObj = {
                                    assetId:'',
                                    mailTo: err.messageData.to,
                                    mailFrom: err.messageData.from,
                                    mailCc: err.messageData.cc,
                                    mailSubject: err.messageData.subject,
                                    mailBody: err.messageData.html,
                                    messageId: null,
                                    mailStatus: false,
                                };
                                dataconn.maillogger(mailObj);
                                console.log("Email Not Sent");
                              });

                          res.status(200).json({ Success: true, Message: "All records saved successfully for BoEMasterDetails", Data: null });

                    })
                    .catch(function (error) {
                        dataconn.errorlogger('SchedulerFunction', 'Get_PO_Files_API', error);
                        res.status(200).json({ Success: false, Message: "Error while saving details for BoEMasterDetails", Data: error });
                    });
                })
                .catch(function (error) {
                    dataconn.errorlogger('SchedulerFunction', 'Get_PO_Files_API', error);
                    res.status(200).json({ Success: false, Message: "Error while truncate for BoEMasterDetails", Data: error });
                });
            })
            .catch((error)=>{

                var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'PO Scheduler',
                             Status: 'Failed',
                             RequestID: result.RequestID,
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'PO Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('failed mail notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

                //dataconn.errorlogger('SchedulerFunction', 'Get_RMO_Files_API', error);
                res.status(200).json({ Success: false, Message: "Error while extracting data from xml", Data: error });  
            }) 
           
        }
        else{
            res.status(200).json({ Success: false, Message: "Error while getting files - GetFiles_API('PO')", Data: error });  
        }
        // console.log('Into then of GetFiles_API',result);
        // res.status(200).json({ Success: true, Message: "All records saved successfully for PO Master", Data: null });
    })
    .catch((error)=>{
        dataconn.errorlogger('SchedulerFunction', 'Get_PO_Files_API', {message:'Error while getting files - GetFiles_API(PO)' , stack:error});

        var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'PO Scheduler',
                             Status: 'Failed',
                             RequestID: 'NA',
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'PO Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('failed mail notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

        res.status(200).json({ Success: false, Message: "Error while getting files - GetFiles_API('PO')", Data: error });  
    })
})

router.route('/Get_FA_Files_API')
.get(function (req, res) {
    APIDump.GetFiles_API('FA')
    .then((result)=>
    {
        console.log('Get_FA_Files_API result',result);
        if(result!='')
        {
            excelService.ExportExcelFile('FA',result.RequestID)
            .then((finalObject)=>{
                //console.log('after ExportExcelFile ',finalObject);
                const famiscmaster = datamodel.famiscmaster();
                famiscmaster.destroy({
                        where: {},
                        truncate: true
                })
                .then(() => {
                    //console.log('Bulk data',result);
                    var bulkdata = finalObject;
                    famiscmaster.bulkCreate(bulkdata).then(() => {
                        return famiscmaster.findAll();
                    })
                    .then((result1) => {
                        
                        var filepath = path.join(__dirname + '/../../Upload/FA/ESS_O_'+result.RequestID+'_BIP.xml');
                        if(fs.existsSync(filepath))
                        {    
                            fs.unlink(filepath,(err)=>{
                                if (err) {
                                    console.log("failed to delete local file:"+err);
                                } else {
                                    console.log('successfully deleted local file');                                
                                }
                            });
                        }   
                        var updatevalues={
                            RequestStatus: 'Final Success',
                            APIObject: 'Data saved and files deleted',
                            EndDate:connect.sequelize.fn("NOW")
                            };
                          var param = { RequestId: result.RequestID , Id: result.MasterschedulerdetailsID };
                          
                          dataaccess.Update(datamodel.Masterschedulerdetails(),updatevalues,param);

                          var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'FA Scheduler',
                             Status: 'Success',
                             RequestID: result.RequestID,
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'FA Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('into notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

                          res.status(200).json({ Success: true, Message: "All records saved successfully for famiscmaster", Data: null });

                    })
                    .catch(function (error) {
                        dataconn.errorlogger('SchedulerFunction', 'Get_FA_Files_API', error);
                        res.status(200).json({ Success: false, Message: "Error while saving details for famiscmaster", Data: error });
                    });
                })
                .catch(function (error) {
                    dataconn.errorlogger('SchedulerFunction', 'Get_FA_Files_API', error);
                    res.status(200).json({ Success: false, Message: "Error while truncate for famiscmaster", Data: error });
                });
            })
            .catch((error)=>{

                var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'FA Scheduler',
                             Status: 'Failed',
                             RequestID: result.RequestID,
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'FA Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('failed mail notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

                //dataconn.errorlogger('SchedulerFunction', 'Get_RMO_Files_API', error);
                res.status(200).json({ Success: false, Message: "Error while extracting data from xml", Data: error });  
            }) 
           
        }
        else{
            res.status(200).json({ Success: false, Message: "Error while getting files - GetFiles_API('FA')", Data: error });  
        }
        // console.log('Into then of GetFiles_API',result);
        // res.status(200).json({ Success: true, Message: "All records saved successfully for PO Master", Data: null });
    })
    .catch((error)=>{
        dataconn.errorlogger('SchedulerFunction', 'Get_FA_Files_API', {message:'Error while getting files - GetFiles_API(FA)' , stack:error});

        var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'FA Scheduler',
                             Status: 'Failed',
                             RequestID: 'NA',
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'FA Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('failed mail notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

        res.status(200).json({ Success: false, Message: "Error while getting files - GetFiles_API('FA')", Data: error });  
    })
})

router.route('/Get_RMO_Files_API')
.get(function (req, res) {
    APIDump.GetFiles_API('RMO')
    .then((result)=>{
        console.log('Get_RMO_Files_API result',result);
        if(result!=''){
            excelService.ExportExcelFile('RMO',result.RequestID)
            .then((finalObject)=>{
                console.log('after ExportExcelFile ',finalObject);
                const rmomaster = datamodel.rmomaster();
                rmomaster.destroy({
                        where: {},
                        truncate: true
                })
                .then(() => {
                    //console.log('Bulk data',result);
                    var bulkdata = finalObject;
                    rmomaster.bulkCreate(bulkdata).then(() => {
                        return rmomaster.findAll();
                    })
                    .then((result1) => {
                        var filepath = path.join(__dirname + '/../../Upload/RMO/ESS_O_'+result.RequestID+'_BIP.xml');
                        console.log('filepath',filepath);
                        if(fs.existsSync(filepath))
                        {    
                            console.log('into filepath');

                            fs.unlink(filepath,(err)=>{
                                if (err) {
                                    console.log("failed to delete local file:"+err);
                                } else {
                                    console.log('successfully deleted local file');                                
                                }
                            });
                        }   
                        var updatevalues={
                            RequestStatus: 'Final Success',
                            APIObject: 'Data saved and files deleted',
                            EndDate:connect.sequelize.fn("NOW")
                            };
                          var param = { RequestId: result.RequestID , Id: result.MasterschedulerdetailsID };
                          
                          dataaccess.Update(datamodel.Masterschedulerdetails(),updatevalues,param);

                          var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'RMO Scheduler',
                             Status: 'Success',
                             RequestID: result.RequestID,
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'RMO Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('into notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

                          res.status(200).json({ Success: true, Message: "All records saved successfully for RMO_master", Data: null });

                    })
                    .catch(function (error) {
                        dataconn.errorlogger('SchedulerFunction', 'Get_RMO_Files_API', error);
                        res.status(200).json({ Success: false, Message: "Error while saving details for RMO_master", Data: error });
                    });
                })
                .catch(function (error) {
                    dataconn.errorlogger('SchedulerFunction', 'Get_RMO_Files_API', error);
                    res.status(200).json({ Success: false, Message: "Error while truncate for RMO_master", Data: error });
                });
            })
            .catch((error)=>{

                var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'RMO Scheduler',
                             Status: 'Failed',
                             RequestID: result.RequestID,
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'RMO Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('failed mail notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

                //dataconn.errorlogger('SchedulerFunction', 'Get_RMO_Files_API', error);
                res.status(200).json({ Success: false, Message: "Error while extracting data from xml", Data: error });  
            })         
        }
        else{
            res.status(200).json({ Success: false, Message: "Error while getting files - GetFiles_API('RMO')", Data: error });  
        }
        // console.log('Into then of GetFiles_API',result);
        // res.status(200).json({ Success: true, Message: "All records saved successfully for PO Master", Data: null });
    })
    .catch((error)=>{
        dataconn.errorlogger('SchedulerFunction', 'Get_RMO_Files_API', {message:'Error while getting files - GetFiles_API(RMO)' , stack:error});

        var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'RMO Scheduler',
                             Status: 'Failed',
                             RequestID: 'NA',
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'RMO Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('failed mail notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

        res.status(200).json({ Success: false, Message: "Error while getting files - GetFiles_API('RMO')", Data: error });  
    })
})

return router;
};


var Get_PO_Files_APIFunction = function(){
    APIDump.GetFiles_API('PO')
    .then((result)=>
    {
        console.log('GetFiles_API result',result);
        if(result!='')
        {
            excelService.ExportExcelFile('PO',result.RequestID)
            .then((finalObject)=>{
                console.log('after ExportExcelFile ',finalObject);
                const BoEMasterDetails = datamodel.BoEMasterDetails();
                BoEMasterDetails.destroy({
                        where: {},
                        truncate: true
                })
                .then(() => {
                    //console.log('Bulk data',result);
                    var bulkdata = finalObject;
                    BoEMasterDetails.bulkCreate(bulkdata).then(() => {
                        return BoEMasterDetails.findAll();
                    })
                    .then((result1) => {
                        var filepath = path.join(__dirname + '/../../Upload/PO/ESS_O_'+result.RequestID+'_BIP.xml');
                        if(fs.existsSync(filepath))
                        {    
                            fs.unlink(filepath,(err)=>{
                                if (err) {
                                    console.log("failed to delete local file:"+err);
                                } else {
                                    console.log('successfully deleted local file');                                
                                }
                            });
                        }   
                        var updatevalues={
                            RequestStatus: 'Final Success',
                            APIObject: 'Data saved and files deleted',
                            EndDate:connect.sequelize.fn("NOW")
                            };
                          var param = { RequestId: result.RequestID , Id: result.MasterschedulerdetailsID };
                          
                          dataaccess.Update(datamodel.Masterschedulerdetails(),updatevalues,param);

                          var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'PO Scheduler',
                             Status: 'Success',
                             RequestID: result.RequestID,
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'PO Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('into notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                                console.log(err);
                                let mailObj = {
                                    assetId:'',
                                    mailTo: err.messageData.to,
                                    mailFrom: err.messageData.from,
                                    mailCc: err.messageData.cc,
                                    mailSubject: err.messageData.subject,
                                    mailBody: err.messageData.html,
                                    messageId: null,
                                    mailStatus: false,
                                };
                                dataconn.maillogger(mailObj);
                                console.log("Email Not Sent");
                              });

                          //res.status(200).json({ Success: true, Message: "All records saved successfully for BoEMasterDetails", Data: null });

                    })
                    .catch(function (error) {
                        dataconn.errorlogger('SchedulerFunction', 'Get_PO_Files_API', error);
                        //res.status(200).json({ Success: false, Message: "Error while saving details for BoEMasterDetails", Data: error });
                    });
                })
                .catch(function (error) {
                    dataconn.errorlogger('SchedulerFunction', 'Get_PO_Files_API', error);
                    //res.status(200).json({ Success: false, Message: "Error while truncate for BoEMasterDetails", Data: error });
                });
            })
            .catch((error)=>{

                var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'PO Scheduler',
                             Status: 'Failed',
                             RequestID: result.RequestID,
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'PO Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('failed mail notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

                //dataconn.errorlogger('SchedulerFunction', 'Get_RMO_Files_API', error);
                //res.status(200).json({ Success: false, Message: "Error while extracting data from xml", Data: error });  
            }) 
           
        }
        else{
            //res.status(200).json({ Success: false, Message: "Error while getting files - GetFiles_API('PO')", Data: error });  
        }
        // console.log('Into then of GetFiles_API',result);
        // res.status(200).json({ Success: true, Message: "All records saved successfully for PO Master", Data: null });
    })
    .catch((error)=>{
        dataconn.errorlogger('SchedulerFunction', 'Get_PO_Files_API', {message:'Error while getting files - GetFiles_API(PO)' , stack:error});

        var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'PO Scheduler',
                             Status: 'Failed',
                             RequestID: 'NA',
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'PO Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('failed mail notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

        //res.status(200).json({ Success: false, Message: "Error while getting files - GetFiles_API('PO')", Data: error });  
    })
}

var Get_FA_Files_APIFunction = function(){
    APIDump.GetFiles_API('FA')
    .then((result)=>
    {
        console.log('Get_FA_Files_API result',result);
        if(result!='')
        {
            excelService.ExportExcelFile('FA',result.RequestID)
            .then((finalObject)=>{
                //console.log('after ExportExcelFile ',finalObject);
                const famiscmaster = datamodel.famiscmaster();
                famiscmaster.destroy({
                        where: {},
                        truncate: true
                })
                .then(() => {
                    //console.log('Bulk data',result);
                    var bulkdata = finalObject;
                    famiscmaster.bulkCreate(bulkdata).then(() => {
                        return famiscmaster.findAll();
                    })
                    .then((result1) => {
                        
                        var filepath = path.join(__dirname + '/../../Upload/FA/ESS_O_'+result.RequestID+'_BIP.xml');
                        if(fs.existsSync(filepath))
                        {    
                            fs.unlink(filepath,(err)=>{
                                if (err) {
                                    console.log("failed to delete local file:"+err);
                                } else {
                                    console.log('successfully deleted local file');                                
                                }
                            });
                        }   
                        var updatevalues={
                            RequestStatus: 'Final Success',
                            APIObject: 'Data saved and files deleted',
                            EndDate:connect.sequelize.fn("NOW")
                            };
                          var param = { RequestId: result.RequestID , Id: result.MasterschedulerdetailsID };
                          
                          dataaccess.Update(datamodel.Masterschedulerdetails(),updatevalues,param);

                          var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'FA Scheduler',
                             Status: 'Success',
                             RequestID: result.RequestID,
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'FA Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('into notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

                          //res.status(200).json({ Success: true, Message: "All records saved successfully for famiscmaster", Data: null });

                    })
                    .catch(function (error) {
                        dataconn.errorlogger('SchedulerFunction', 'Get_FA_Files_API', error);
                        //res.status(200).json({ Success: false, Message: "Error while saving details for famiscmaster", Data: error });
                    });
                })
                .catch(function (error) {
                    dataconn.errorlogger('SchedulerFunction', 'Get_FA_Files_API', error);
                    //res.status(200).json({ Success: false, Message: "Error while truncate for famiscmaster", Data: error });
                });
            })
            .catch((error)=>{

                var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'FA Scheduler',
                             Status: 'Failed',
                             RequestID: result.RequestID,
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'FA Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('failed mail notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

                //dataconn.errorlogger('SchedulerFunction', 'Get_RMO_Files_API', error);
                //res.status(200).json({ Success: false, Message: "Error while extracting data from xml", Data: error });  
            }) 
           
        }
        else{
            //res.status(200).json({ Success: false, Message: "Error while getting files - GetFiles_API('FA')", Data: error });  
        }
        // console.log('Into then of GetFiles_API',result);
        // res.status(200).json({ Success: true, Message: "All records saved successfully for PO Master", Data: null });
    })
    .catch((error)=>{
        dataconn.errorlogger('SchedulerFunction', 'Get_FA_Files_API', {message:'Error while getting files - GetFiles_API(FA)' , stack:error});

        var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'FA Scheduler',
                             Status: 'Failed',
                             RequestID: 'NA',
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'FA Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('failed mail notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

        //res.status(200).json({ Success: false, Message: "Error while getting files - GetFiles_API('FA')", Data: error });  
    })
}

var Get_RMO_Files_APIFunction = function(){
    APIDump.GetFiles_API('RMO')
    .then((result)=>{
        console.log('Get_RMO_Files_API result',result);
        if(result!=''){
            excelService.ExportExcelFile('RMO',result.RequestID)
            .then((finalObject)=>{
                console.log('after ExportExcelFile ',finalObject);
                const rmomaster = datamodel.rmomaster();
                rmomaster.destroy({
                        where: {},
                        truncate: true
                })
                .then(() => {
                    //console.log('Bulk data',result);
                    var bulkdata = finalObject;
                    rmomaster.bulkCreate(bulkdata).then(() => {
                        return rmomaster.findAll();
                    })
                    .then((result1) => {
                        var filepath = path.join(__dirname + '/../../Upload/RMO/ESS_O_'+result.RequestID+'_BIP.xml');
                        console.log('filepath',filepath);
                        if(fs.existsSync(filepath))
                        {    
                            console.log('into filepath');

                            fs.unlink(filepath,(err)=>{
                                if (err) {
                                    console.log("failed to delete local file:"+err);
                                } else {
                                    console.log('successfully deleted local file');                                
                                }
                            });
                        }   
                        var updatevalues={
                            RequestStatus: 'Final Success',
                            APIObject: 'Data saved and files deleted',
                            EndDate:connect.sequelize.fn("NOW")
                            };
                          var param = { RequestId: result.RequestID , Id: result.MasterschedulerdetailsID };
                          
                          dataaccess.Update(datamodel.Masterschedulerdetails(),updatevalues,param);

                          var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'RMO Scheduler',
                             Status: 'Success',
                             RequestID: result.RequestID,
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'RMO Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('into notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

                          //res.status(200).json({ Success: true, Message: "All records saved successfully for RMO_master", Data: null });

                    })
                    .catch(function (error) {
                        dataconn.errorlogger('SchedulerFunction', 'Get_RMO_Files_API', error);
                        //res.status(200).json({ Success: false, Message: "Error while saving details for RMO_master", Data: error });
                    });
                })
                .catch(function (error) {
                    dataconn.errorlogger('SchedulerFunction', 'Get_RMO_Files_API', error);
                    //res.status(200).json({ Success: false, Message: "Error while truncate for RMO_master", Data: error });
                });
            })
            .catch((error)=>{

                var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'RMO Scheduler',
                             Status: 'Failed',
                             RequestID: result.RequestID,
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'RMO Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('failed mail notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

                //dataconn.errorlogger('SchedulerFunction', 'Get_RMO_Files_API', error);
                //res.status(200).json({ Success: false, Message: "Error while extracting data from xml", Data: error });  
            })         
        }
        else{
            //res.status(200).json({ Success: false, Message: "Error while getting files - GetFiles_API('RMO')", Data: error });  
        }
        // console.log('Into then of GetFiles_API',result);
        // res.status(200).json({ Success: true, Message: "All records saved successfully for PO Master", Data: null });
    })
    .catch((error)=>{
        dataconn.errorlogger('SchedulerFunction', 'Get_RMO_Files_API', {message:'Error while getting files - GetFiles_API(RMO)' , stack:error});

        var templateLocation = path.join(__dirname + '/../../Templates/Scheduler/SchedulerMail.ejs');
                          let mailtemplateData = {
                             Schedulernaame: 'RMO Scheduler',
                             Status: 'Failed',
                             RequestID: 'NA',
                             Date: moment(new Date()).format('DD-MM-YYYY h:mm:ss a')
                         }; 
                         emailservice.notifyMail(SchedulerEmailConfig.SchedulerEmailConfig.fromEmail,SchedulerEmailConfig.SchedulerEmailConfig.toEmail,SchedulerEmailConfig.SchedulerEmailConfig.ccEmail,'RMO Master Scheduler Details',templateLocation,mailtemplateData)
                            .then((mailresults) => {
                                console.log('failed mail notify');
                                let mailObj = {
                                    mailTo:mailresults.messageData.to,
                                    mailFrom: mailresults.messageData.from,
                                    mailCc: mailresults.messageData.cc,
                                    mailSubject: mailresults.messageData.subject,
                                    mailBody: mailresults.messageData.html,
                                    messageId: mailresults.info.messageId,
                                    mailStatus: true,
                                  };
                                  dataconn.maillogger(mailObj);
                            })
                            .catch((err) => {
                              console.log(err);
                              let mailObj = {
                                assetId:'',
                                mailTo: err.messageData.to,
                                mailFrom: err.messageData.from,
                                mailCc: err.messageData.cc,
                                mailSubject: err.messageData.subject,
                                mailBody: err.messageData.html,
                                messageId: null,
                                mailStatus: false,
                              };
                              dataconn.maillogger(mailObj);
                              console.log("Email Not Sent");
                              });

        //res.status(200).json({ Success: false, Message: "Error while getting files - GetFiles_API('RMO')", Data: error });  
    })
}

module.exports = routes;
module.exports.Get_PO_Files_APIFunction = Get_PO_Files_APIFunction;
module.exports.Get_FA_Files_APIFunction = Get_FA_Files_APIFunction;
module.exports.Get_RMO_Files_APIFunction = Get_RMO_Files_APIFunction;