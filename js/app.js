_.templateSettings={evaluate:/\{\{#([\s\S]+?)\}\}/g,interpolate:/\{\{[^#\{]([\s\S]+?)[^\}]\}\}/g,escape:/\{\{\{([\s\S]+?)\}\}\}/g};var app=app||{};$(function(){function e(e){$("#"+e+".overlay").show(),$(".hamburger").addClass("active close-overlay")}function t(){$(".overlay").hide(),$(".hamburger").removeClass("active close-overlay"),Backbone.history.navigate("/timeline",{trigger:!0})}"function"!=typeof String.prototype.endsWith&&(String.prototype.endsWith=function(e){return-1!==this.indexOf(e,this.length-e.length)}),app.deleteTimeoutID,app.lastHeader,app.nmodel=Backbone.View.extend({tagName:"li",events:{"click .close":"close"},template:_.template('<span{{ success ? \' class="success"\' : \'\' }}>{{ msg }} <a href="#" class="close">&times;</a></span>'),close:function(){this.$el.fadeOut("slow",function(){$(this).remove()})},render:function(){return this.$el.html(this.template(this.model)),setTimeout(function(){this.$(".close").trigger("click")},2e4),this}}),app.notify=function(e,t){var a="undefined"==typeof t?new app.nmodel({model:{msg:e,success:!1}}):new app.nmodel({model:{msg:e,success:t}});$(".gritter").prepend(a.render().el)},app.Activity=Backbone.Model.extend({defaults:{}});var a=Backbone.Collection.extend({local:!0,url:"api/activities",model:app.Activity});window.app.Activities=new a,app.Item=Backbone.Model.extend({defaults:{}});var n=Backbone.Collection.extend({local:!0,url:"api/entries",model:app.Item,comparator:function(e){return-e.get("date")}});window.app.Items=new n,app.ItemView=Backbone.View.extend({tagName:"li",className:"timeline-item",events:{"click a.delete":"delete"},template:_.template($("#templates-item").html()),initialize:function(){this.model.on("destroy",this.deleteCallback,this)},"delete":function(){return this.$el.remove(),deleteTimeoutID=setTimeout(this.model.destroy(),1e4),!1},deleteCallback:function(){},render:function(){var e=this.model.toJSON();return e.description=e.description.replace(/#([^\W]+)/,'<a href="filter/$1" class="hash">#$1</a>'),e.description=e.description.replace(/@([^\W]+)/,'<a href="user/$1" class="user">@$1</a>'),this.$el.html(this.template(e)),this.$el.addClass("c"==e.type?"cr":"dr"),this}}),app.AppView=Backbone.View.extend({el:"body",events:{"change select[name=type]":"changeOverlayBGColor","click a.get-started":"showApp","submit #form-settings":"submitSettings","submit #form-add":"submitItem","click a.undo-delete":"undoDelete","click a.add-new":"route","click a.close-overlay":"closeOverlay","click a.hamburger:not(.close-overlay)":"toggleMenu"},initialize:function(){window.app.Items.on("add",this.addItem,this),_.bindAll(this,"onItemFetch"),window.app.Items.fetch({success:this.onItemFetch,silent:!0}),window.onpopstate=this.popState.bind(this)},popState:function(){document.location.href},closeOverlay:function(){t()},route:function(e){var t=$(e.target).attr("href")?$(e.target).attr("href"):$(e.target).parent().attr("href");return Backbone.history.navigate(t,{trigger:!0}),!1},showApp:function(){return this.$("#home").hide(),this.$("#timeline").show(),this.$("header").show(),Backbone.history.navigate("/timeline",{trigger:!0}),app.settings.currency||Backbone.history.navigate("/settings",{trigger:!0}),!1},toggleMenu:function(){this.$(".hamburger").hasClass("active")?(this.$(".hamburger").removeClass("active"),this.$(".menu").hide()):(this.$(".menu").show(),this.$(".hamburger").addClass("active"))},onItemFetch:function(){app.Items.sort(),app.Items.each(this.addItemAppended,this)},addItem:function(e){app.lastHeader=null,this.$("#timeline").empty(),app.Items.each(this.addItemAppended,this)},addItemAppended:function(e){var t=e.get("date"),a=moment(t).calendar(null,{sameDay:"[Today]",nextDay:"[Tomorrow]",lastDay:"[Yesterday]",lastWeek:"[Last week]",sameElse:"[Others]"});app.lastHeader!=a&&(app.lastHeader=a,this.$("#timeline").append('<ul class="timeline h-'+app.lastHeader.toLowerCase().replace(/\W/g,"")+'">                    <li class="timeline-line"></li>                    <li class="timeline-group"><h5>'+app.lastHeader+"</h5></li>"));var n=new app.ItemView({model:e});this.$(".h-"+app.lastHeader.toLowerCase().replace(/\W/g,"")).append(n.render().el)},changeOverlayBGColor:function(){var e=$("#form-add select[name=type]").val();"c"==e?$("#newform.overlay").addClass("cr"):$("#newform.overlay").removeClass("cr")},undoDelete:function(){app.deleteTimeoutID&&(clearTimeout(app.deleteTimeoutID),app.deleteTimeoutID=null)},submitSettings:function(){var e=$("#form-settings input[name=currency]").val().trim();return _.isEmpty(e)?(app.notify("Enter the currency symbol."),$("#form-add input[name=amount]").focus(),!1):(localStorage.setItem("currency",e),app.settings.currency=e,Backbone.history.navigate("/timeline",{trigger:!0}),!1)},submitItem:function(){var e=$("#form-add input[name=description]").val().trim();if(_.isEmpty(e))return app.notify("You did not enter the description."),$("#form-add input[name=description]").focus(),!1;var t=$("#form-add input[name=amount]").val().replace(/[^0-9\.]/g,"");if(_.isEmpty(t))return app.notify("Enter the amount."),$("#form-add input[name=amount]").focus(),!1;var a=$("#form-add input[name=date]").val().trim();if(_.isEmpty(a))a=moment();else{if(!moment(a).isValid())return app.notify("Enter the valid date."),$("#form-add input[name=date]").focus(),!1;if(moment()<moment(a))return app.notify("Future dates not allowed."),$("#form-add input[name=date]").focus(),!1}var n=$("#form-add select[name=type]").val();return"c"!=n&&"d"!=n?(app.notify("You did not select the type."),$("#form-add select[name=type]").focus(),!1):(app.Items.create({description:e,amount:t,type:n,date:moment(a).valueOf()}),Backbone.history.navigate("/timeline",{trigger:!0}),!1)}});var i=Backbone.Router.extend({routes:{timeline:"TL",add:"addNew",settings:"showSettings"},TL:function(){return document.title="Billtab",t(),$("#form-add")[0].reset(),$(".overlay").removeClass("cr"),!1},addNew:function(){return document.title="Add new item",app.settings.currency?(e("newform"),$("#form-add input[name=description]").focus(),!1):(app.notify("Set your currency"),Backbone.history.navigate("/settings",{trigger:!0}),!1)},showSettings:function(){document.title="Settings",e("settings")}});app.router=new i,Backbone.history.start({pushState:!0})});