jQuery.sap.require("projectX.util.Formatter");
jQuery.sap.require("projectX.util.Controller");

projectX.util.Controller.extend("projectX.view.Master", {

	onInit : function() {
		this.oInitialLoadFinishedDeferred = jQuery.Deferred();

		this.getView().byId("list").attachEventOnce("updateFinished", function() {
			this.oInitialLoadFinishedDeferred.resolve();
			oEventBus.publish("Master", "InitialLoadFinished");
		}, this);

		var oEventBus = this.getEventBus();
		oEventBus.subscribe("Detail", "TabChanged", this.onDetailTabChanged, this);

		//on phones, we will not have to select anything in the list so we don't need to attach to events
		if (sap.ui.Device.system.phone) {
			return;
		}

		this.getRouter().getRoute("main").attachPatternMatched(this.onRouteMatched, this);

		oEventBus.subscribe("Detail", "Changed", this.onDetailChanged, this);
		oEventBus.subscribe("Detail", "NotFound", this.onNotFound, this);
	},

	onRouteMatched : function(oEvent) {

		//Load the detail view in desktop
		this.getRouter().myNavToWithoutHash({ 
			currentView : this.getView(),
			targetViewName : "projectX.view.Detail",
			targetViewType : "XML"
		});

		//Wait for the list to be loaded once
		this.waitForInitialListLoading(function () {

			//On the empty hash select the first item
			var oFirstItem = this.selectFirstItem();

			if(oFirstItem) {

				//inform the detail view that the first item is selected so the detail view displays the correct data
				this.getEventBus().publish("Master", "FirstItemSelected", oFirstItem);

			} else {

				//no Product in the list - show the create view
				this.onAddProduct();

			}

		});

	},

	onDetailChanged : function (sChanel, sEvent, oData) {
		var sProductPath = oData.sProductPath;
		//Wait for the list to be loaded once
		this.waitForInitialListLoading(function () {
			var oList = this.getView().byId("list");

			var oSelectedItem = oList.getSelectedItem();
			// the correct item is already selected
			if (oSelectedItem && oSelectedItem.getBindingContext().getPath() === sProductPath) {
				return;
			}

			var aItems = oList.getItems();

			for (var i = 0; i < aItems.length; i++) {
				if (aItems[i].getBindingContext().getPath() === sProductPath) {
					oList.setSelectedItem(aItems[i], true);
					break;
				}
			}
		});
	},

	onDetailTabChanged : function (sChanel, sEvent, oData) {
		this.sTab = oData.sTabKey;
	},

	waitForInitialListLoading : function (fnToExecute) {
		jQuery.when(this.oInitialLoadFinishedDeferred).then(jQuery.proxy(fnToExecute, this));
	},

	onNotFound : function () {
		this.getView().byId("list").removeSelections();
	},

	selectFirstItem : function() {
		var oList = this.getView().byId("list");
		var aItems = oList.getItems();
		if (aItems.length) {
			oList.setSelectedItem(aItems[0], true);
			return aItems[0];
		}
	},


	onSelect : function(oEvent) {
		// Get the list item, either from the listItem parameter or from the event's
		// source itself (will depend on the device-dependent mode).
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
	},

	showDetail : function(oItem) {
		var oBindingContext = oItem.getBindingContext();
        var oModel = oBindingContext.getModel();
        var sPath = oBindingContext.getPath();
        var oSelectedRequest = oModel.getProperty(sPath);
		
		// If we're on a phone, include nav in history; if not, don't.
		var bReplace = jQuery.device.is.phone ? false : true;
		this.getRouter().navTo("product", {
			requestID : oSelectedRequest.getIdentifier()
		}, bReplace);
	},

	/**
	 * the user wants to add a new project.
	 * navigate to the new project screen.
	 */
	onAddNewProject : function() {
		this.getRouter().myNavToWithoutHash({ 
			currentView : this.getView(),
			targetViewName : "projectX.view.AddProduct",
			targetViewType : "XML",
			transition : "slide"
		});
	},
	
	/**
	 * add a new request to the currently selected project 
	 */
	onAddRequest : function() {
		//get the model
		var oModel = this.getView().getModel();
		//get the selected project
		var oSelectedProject = oModel.getProperty("/SelectedProject");
		if(!oSelectedProject) {
			return;
		}
		
		oSelectedProject.addNewRequest();
		oModel.updateBindings();
		//TODO select the newly created request
	},
	
	/**
	 * the user selected a project.
	 * make sure the master list shows the request of this project
	 */
	onSelectProjectChange : function(oEvent){
		var oSelectedItem = oEvent.getParameter("selectedItem");
		var oBindingContext = oSelectedItem.getBindingContext();
		var oModel = this.getView().getModel();
		oModel.setProperty("/SelectedProject", oModel.getProperty(oBindingContext.getPath()));
	}

});