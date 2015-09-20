/**
 * collection of formatter functions for bindings
 */
sap.ui.define(['jquery.sap.global',
				'sap/m/MessageBox',
				'projectX/util/Controller',
				'projectX/util/Constants',
				'projectX/util/Formatter',
				'projectX/util/Helper',
				'projectX/util/Assertion'],
	function(jQuery, MessageBox, Controller, Constants, Formatter, Helper, Assertion) {
		"use strict";

		var Master = Controller.extend("projectX.view.Master.Master", {
			metadata: {}
		});


		// /////////////////////////////////////////////////////////////////////////////
		// /// Members
		// /////////////////////////////////////////////////////////////////////////////

		Master.prototype._localUIModel = null;

		Master.TABS = {
			REQUESTS : "REQUESTS",
			SEQUENCES : "SEQUENCES"
		};

		// /////////////////////////////////////////////////////////////////////////////
		// /// Initialization
		// /////////////////////////////////////////////////////////////////////////////

		Master.prototype.onInit = function() {
			//create local ui model
			this._localUIModel = new sap.ui.model.json.JSONModel();
			this._localUIModel.setData({
				visibleTab: "REQUESTS"
			});
			this.getView().setModel(this._localUIModel, "localUIModel");

			this.getRouter().getRoute("main").attachPatternMatched(this.onRouteMatched, this);



			var oEventBus = sap.ui.getCore().getEventBus();
			oEventBus.subscribe(Constants.EVENTCHANNEL_SELECTEDPROJECT,
				Constants.EVENT_SELECTEDPROJECT_CHANGED,
				function(){
					//this._localUIModel.setProperty("/visibleTab", Master.TABS.REQUESTS);
					this._removeSelectionFromRequestList();
					this._removeSelectionFromSequenceList();
					var oSegmentedButton = this.getView().byId("idSegmentedButton");
					oSegmentedButton.setSelectedButton(this.getView().byId("idButtonRequests"));
					this._localUIModel.setProperty("/visibleTab", Master.TABS.REQUESTS);
			}, this);

			//if ?sequence=true exists in url then switch to sequence page after 2 seconds
			if (jQuery.sap.getUriParameters().get("sequence") === "true") {
				setTimeout(jQuery.proxy( function() {
					var oList = this.getView().byId("idListSequences");
					var aItems = oList.getItems();
					if (aItems.length) {
						oList.setSelectedItem(aItems[0], true);
						var oSelectedSequence = Helper.getBoundObjectForItem(aItems[0]);
						this.getRouter().navTo("sequence", {
							sequenceID : oSelectedSequence.getIdentifier(),
							reason : "edit"
						}, true);
						this._removeSelectionFromRequestList();
					}

				}, this), 2000);
			}

			if (jQuery.sap.getUriParameters().get("editproject") === "true") {
				setTimeout(jQuery.proxy( function() {
					this.onEditProject();
				}, this), 1000);
			}

			if (jQuery.sap.getUriParameters().get("metadata") === "true") {
				setTimeout(jQuery.proxy( function() {
					this.onAddRequestMetadata();
				}, this), 1000);
			}

			this.getRouter().getRoute("product").attachMatched(function(oEvent){

				//TODO how to prevent double selection if navigation happend from inside master controller
				var oParameters = oEvent.getParameters();
				var iRequestId = parseInt(oParameters.arguments.requestID, 10);
				var oSegmentedButton = this.getView().byId("idSegmentedButton");
				oSegmentedButton.setSelectedButton(this.getView().byId("idButtonRequests"));
				this._localUIModel.setProperty("/visibleTab", Master.TABS.REQUESTS);
				var bItemSelected = this._selectRequestByReqId("idListRequests", iRequestId);
			}, this);
		};

		Master.prototype.onBeforeShow = function() {
			var oListSequences = this.getView().byId("idListSequences");
			var oListRequests = this.getView().byId("idListRequests");
			var oSorter = new sap.ui.model.Sorter("mProperties/name", false);
			oListSequences.getBinding("items").sort(oSorter);
			oListRequests.getBinding("items").sort(oSorter);
		};

		Master.prototype.onRouteMatched = function(oEvent) {

		};

		// /////////////////////////////////////////////////////////////////////////////
		// /// List Event Handler
		// /////////////////////////////////////////////////////////////////////////////

		Master.prototype.onSequencesListSelect = function() {
			var oList = this.getView().byId("idListSequences");
			var oItem = oList.getSelectedItem();
			if (!oItem) {
				this._selectFirstSequence();
				return;
			}
			var oSelectedSequence = Helper.getBoundObjectForItem(oItem);

			this.getRouter().navTo("sequence", {
				sequenceID : oSelectedSequence.getIdentifier(),
				reason : "edit"
			}, true);
			//this._removeSelectionFromRequestList();
		};

		Master.prototype.onRequestsListSelect = function() {
			var oList = this.getView().byId("idListRequests");
			var oItem = oList.getSelectedItem();
			if (!oItem) {
				this._selectFirstRequest();
				return;
			}
			var oSelectedRequest = Helper.getBoundObjectForItem(oItem);

			var oModel = this.getView().getModel();
			var oSelectedProject = oModel.getProperty("/SelectedProject");

			this.navToRequest(oSelectedRequest.getIdentifier(), oSelectedProject.getIdentifier());
		};

		Master.prototype._filterList = function(sQuery, oList){
			// add filter for search
			var aFilters = [];

			if (sQuery && sQuery.length > 0) {
				var filter = new sap.ui.model.Filter("mProperties/name",
					sap.ui.model.FilterOperator.Contains,
					sQuery);
				aFilters.push(filter);
			}

			// update list binding
			var binding = oList.getBinding("items");
			binding.filter(aFilters, "Application");
		};

		Master.prototype.onRequestSearch = function(oEvent) {
			var sQuery = oEvent.getSource().getValue();
			this._filterList(sQuery, this.getView().byId("idListRequests"));
		};

		Master.prototype.onSequenceSearch = function(oEvent) {
			var sQuery = oEvent.getSource().getValue();
			this._filterList(sQuery, this.getView().byId("idListSequences"));
		};


		Master.prototype.onBtnDuplicateRequestPress = function(oEvent) {
			var oRequest = Helper.getBoundObjectForItem(oEvent.getSource());
			var oComponent = this.getComponent();
			oComponent.duplicateRequest(oRequest);
		};

		Master.prototype.onBtnDeleteRequestPress = function(oEvent) {
			var oRequest = Helper.getBoundObjectForItem(oEvent.getSource());
			var oComponent = this.getComponent();
			var that = this;
			MessageBox.show("Do you really want to delete this entry?", {
					icon : MessageBox.Icon.WARNING,
					title : "Confirmation",
					actions : [MessageBox.Action.YES, MessageBox.Action.NO],
					initialFocus : MessageBox.Action.NO,
					onClose : function(oAction) {
						if (oAction === MessageBox.Action.YES) {
								oComponent.deleteRequest(oRequest);
								that._selectFirstRequest();

						} else if (oAction === MessageBox.Action.NO) {
							// MessageBox will be closed
						} else {
							// do nothing. user canceled his action
						}
					}

			});
			// var bDeletionOk = this._confirmDeletion();
			//
			// if (bDeletionOk) {
			// 	oComponent.deleteRequest(oRequest);
			// 	this._selectFirstRequest();
			// }

		};

		Master.prototype.onBtnDuplicateSequencePress = function(oEvent) {
			var oSequence = Helper.getBoundObjectForItem(oEvent.getSource());
			var oComponent = this.getComponent();
			oComponent.duplicateSequence(oSequence);
		};

		Master.prototype.onBtnDeleteSequencePress = function(oEvent) {
			var oSequence = Helper.getBoundObjectForItem(oEvent.getSource());
			var oComponent = this.getComponent();
			var that = this;
			MessageBox.show("Do you really want to delete this entry?", {
					icon : MessageBox.Icon.WARNING,
					title : "Confirmation",
					actions : [MessageBox.Action.YES, MessageBox.Action.NO],
					initialFocus : MessageBox.Action.NO,
					onClose : function(oAction) {
						if (oAction === MessageBox.Action.YES) {
							oComponent.deleteSequence(oSequence);
							that._selectFirstSequence();

						} else if (oAction === MessageBox.Action.NO) {
							// MessageBox will be closed
						} else {
							// do nothing. user canceled his action
						}
					}

			});
			// var bDeletionOk = this._confirmDeletion();
			//
			// if (bDeletionOk) {
			// 	oComponent.deleteSequence(oSequence);
			// 	this._selectFirstSequence();
			// }

		};


		// /////////////////////////////////////////////////////////////////////////////
		// /// Segmented Button Event Handler
		// /////////////////////////////////////////////////////////////////////////////

		Master.prototype.onSegmentedButtonSelect = function(oEvent){
			var sSelectedId = oEvent.getParameter("id");
			switch (sSelectedId) {
				case this.createId("idButtonRequests"):
					this._localUIModel.setProperty("/visibleTab", Master.TABS.REQUESTS);
					this.onRequestsListSelect();
					break;
				case this.createId("idButtonSequences"):
					this._localUIModel.setProperty("/visibleTab", Master.TABS.SEQUENCES);
					this.onSequencesListSelect();
					break;
			default:
				console.log("problem with segmented button on master page");
			}
		};

		// /////////////////////////////////////////////////////////////////////////////
		// /// Toolbar Event Handler
		// /////////////////////////////////////////////////////////////////////////////

		/**
		* add a new request to the currently selected project
		*/
		Master.prototype.onAddRequest = function() {
			//get the model
			var oModel = this.getView().getModel();
			//get the selected project
			var oSelectedProject = oModel.getProperty("/SelectedProject");
			if (!oSelectedProject) {
				return;
			}

			var oNewRequest = oSelectedProject.addNewRequest();
			oNewRequest.addAssertion(Assertion.createDefaultAssertion());
			oModel.updateBindings();
			//TODO select the newly created request
		};


		/**
		* show the odata service metadata page
		* to let the user add a request based on odata metadata information.
		*/
		Master.prototype.onAddRequestMetadata = function() {
			this._showODataRequestDialog();
		};


		Master.prototype.onAddNewSequence = function() {
			var oModel = this.getView().getModel();
			//get the selected project
			var oSelectedProject = oModel.getProperty("/SelectedProject");
			if (!oSelectedProject) {
				return;
			}

			var oSequence = oSelectedProject.addNewSequence();
			oModel.updateBindings();
			//select the newly created sequence
			this.getRouter().navTo("sequence", {
				sequenceID : oSequence.getIdentifier(),
				reason : "edit"
			}, true);
		};

		// /////////////////////////////////////////////////////////////////////////////
		// /// Private Methods
		// /////////////////////////////////////////////////////////////////////////////

		Master.prototype._removeSelectionFromRequestList = function () {
			var oList = this.getView().byId("idListRequests");
			oList.removeSelections(true);
		};

		Master.prototype._removeSelectionFromSequenceList = function () {
			var oList = this.getView().byId("idListSequences");
			oList.removeSelections(true);
		};
		/**
		 * show a message box where the user can confirm deletion
		 * @return {bool} bDeletion
		 */
		 Master.prototype._confirmDeletion = function() {
			 var bDeletionOk = false;
			 // show message box
			 MessageBox.show("Do you really want to delete this entry?", {
					 icon : MessageBox.Icon.WARNING,
					 title : "Confirmation",
					 actions : [MessageBox.Action.YES, MessageBox.Action.NO],
					 initialFocus : MessageBox.Action.NO,
					 onClose : function(oAction) {
						 if (oAction === MessageBox.Action.YES) {
							 bDeletionOk = true;
						 } else if (oAction === MessageBox.Action.NO) {
							 // MessageBox will be closed with button NO
						 } else {
							 // do nothing. user canceled his action via escape key or something similar
						 }
					 }

			 });

			 return bDeletionOk;
		 };

		Master.prototype._selectFirstRequest = function () {
			var bItemSelected = this._selectFirstItem("idListRequests", "");
			if (bItemSelected === true) {
				this.onRequestsListSelect();
			} else {
				//TODO detail page to "NOT FOUND"
			}
		};

		Master.prototype._selectFirstSequence = function () {
			var bItemSelected = this._selectFirstItem("idListSequences");
			if (bItemSelected === true) {
				this.onSequencesListSelect();
			} else {
				//TODO detail page to "NOT FOUND"
			}
		};

		Master.prototype._selectFirstItem = function (sListId) {
			var oList = this.getView().byId(sListId);
			var aItems = oList.getItems();

			if (aItems.length) {
				oList.setSelectedItem(aItems[0], true);
				return true;
			}

			return false;
		};

		/**
		 * set the listitem that represents the given requestID
		 */
		Master.prototype._selectRequestByReqId = function (sListId, iRequestId) {
			var oList = this.getView().byId(sListId);
			var aItems = oList.getItems();
			var oSelectedRequest = oList.getSelectedItem();

			for (var i = 0; i < aItems.length; i++) {
				var oRequest = Helper.getBoundObjectForItem(aItems[i]);
				if(oRequest.getIdentifier() === iRequestId){
					if(oSelectedRequest === aItems[i]){
						//the request is already selected, no need
						//to remove all selections and select again
						return true;
					}
					this._removeSelectionFromRequestList();
					this._removeSelectionFromSequenceList();
					oList.setSelectedItem(aItems[i], true);
					return true;
				}
			}

			return false;
		};


		Master.prototype._showODataRequestDialog = function(oEvent) {
			var oView = sap.ui.xmlview("projectX.view.Metadata.MetadataRequest");
			var dialog = new sap.m.Dialog({
					title: 'Add new request based on OData metadata',
					contentWidth: "80%",
					contentHeight: "90%",
					content: oView,
					beginButton: new sap.m.Button({
						text: 'OK',
						press: function () {
							dialog.close();
						}
					}),
					afterClose: function() {
						dialog.destroy();
					}
				});

				//to get access to the global model
				this.getView().addDependent(dialog);
				dialog.open();
			oView.getController().onRouteMatched();
		};

		return Master;

	}, /* bExport= */ true);
