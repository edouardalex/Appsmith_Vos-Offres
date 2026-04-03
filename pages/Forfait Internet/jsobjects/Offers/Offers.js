export default {
	fetchData: [],
	offers: [],
	pricePayed: 0,
	loading: true,
	
	getSavingsUnit: (savings) => savings >= 0 ? "d'économies" : "de surcoût",
	getSavingsTextColor: (savings) => savings >= 0 ? Constants.colors.success : Constants.colors.failure,
	
	selectedPlan: null,
	
	updatePricePayed() {
		const intPrice = parseInt(appsmith.URL.queryParams.price);
		if (isNaN(intPrice)) 
			return console.error("Price payed is not a number");
		this.pricePayed = intPrice / 100;
	},
	
	formatOffer(offer) {
		const offerPrice = offer.Prix.replace(',', '.').replace('€', '').trim();
		const offerPriceNumber = parseFloat(offerPrice) * 0.66;
		const yearlySavings = isNaN(offerPriceNumber) ? 0 : (this.pricePayed - offerPriceNumber) * 12;
		
		offer.savings = Math.round((Math.abs(yearlySavings)));
		offer.savingsUnit = this.getSavingsUnit(yearlySavings);
		offer.savingsTextColor = this.getSavingsTextColor(yearlySavings);

		return offer;
	},
	
	async formatOffers() {
		const userOperator = appsmith.URL.queryParams.partnerSelect;
		const hiddenOperators = Constants.operatorsToHideMap[userOperator] || [];
		const connectionType = appsmith.URL.queryParams.type;
	
		if (connectionType === "adsl") {
			await Get_Forfait_Adsl.run();
			this.fetchData = Get_Forfait_Adsl.data
		}
		
		if (connectionType === "fibre") {
			await Get_Forfaits_Fibre.run();
			this.fetchData = Get_Forfaits_Fibre.data
		}
		
		this.updatePricePayed();
	
		for (let offer of this.fetchData) {
			if (!hiddenOperators.includes(offer.Opérateur)) {
				this.offers.push(
					this.formatOffer(offer)
				);
			}
		}

		this.loading = false;
		console.log(this.offers, hiddenOperators);
	},
	
	openOfferModal(plan) {
		this.selectedPlan = plan;
		showModal(Modal_display_plan.name);
	}
}