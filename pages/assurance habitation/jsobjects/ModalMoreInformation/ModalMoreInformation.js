export default {
	clicked_description_title: {},
	formatNumber(value) {
		const rounded = Math.round(value * 100) / 100;
		return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
	},
	setSelectedOffer: (offer) => {
		SharedOffers.selectedOffer = offer;
		SharedOffers.selectedOfferIds["offerId"] = offer.offerId;
	},
	getOptionValue(option) {
		if (option.type == "number")
			return parseInt(option.value) / 100;

		if (option.type == "boolean")
			return option.value == "true" ? true : false
	

		return option.value;
	},
	getOptionImpacts: (responses) => {
		/**
     * Raw Ex: '{"true":{"impact":3.7,"type":"percentage"},"false":{"impact":0,"type":"percentage"}}'
     * Parsed: {true: { impact: 3.7, type: 'percentage' }, false: { impact: 0, type: 'percentage' }}
     * Return: [
     *            { value: 'true', impact: 3.7, type: 'percentage' },
     *            { value: 'false', impact: 0, type: 'percentage' }
     *          ]
     */
		if (!responses) return {};

		const parsedResponses = JSON.parse(responses);
		return Object.entries(parsedResponses).map(([key, value]) => ({
			value: key,
			...value
		}));
	},
	formatOptionsImpact(impacts) {
		for (let impact of impacts) {
			impact["current_impact_on_price"] = 0;
		}
		return impacts;
	},
	formatOffer: (offer) => {
		offer.options.map((categoryOptions) => {
			categoryOptions.options.map((option) => {
				option.value = this.getOptionValue(option);
				if (option.customizable) {
					const optionImpacts = this.getOptionImpacts(option.responses);
					option["impacts"] = this.formatOptionsImpact(optionImpacts);
				}
				console.log("formatOffer", option);
			});
		});
		SharedOffers.selectedOffer = offer;
	},
	getSelectedImpactOfOption: (option) => {
		if (!("impacts" in option))
			return null;

		for (let impact of option.impacts) {
			if (impact.value == String(option.value))
				return impact;
		}
		return null;
	},
	computeImpactValueOnPrice: (price, impact) => {
		if (impact.impact == "0")
			return 0;

		const impact_value = parseFloat(impact.impact);

		if (isNaN(impact_value))
			return 0;

		switch (impact.type) {
			case "amount":
				return impact_value;

			case "percentage":
				return impact_value / 100 * price
		}
		return 0;
	},
	updatePricesImpacts: async (offer) => {
		let finalPrice = parseFloat(SharedOffers.selectedOffer.price);

		offer.options.map((categoryOptions) => {
			categoryOptions.options.map((option) => {
				if (option.impacts) {
					option.impacts.map((impact) => {
						if (impact.value == String(option.value)) {
							const impactValue = this.computeImpactValueOnPrice(offer.price, impact);
							impact.current_impact_on_price = this.formatNumber(impactValue);
							finalPrice += impactValue;
						}
					})
				}
			});
		});

		offer.impacted_price = String(finalPrice.toFixed(2));

		if (finalPrice != parseFloat(SharedOffers.selectedOffer.price))
			offer.impacted_price = "~" + offer.impacted_price;

		// compute savings
		offer.computedSavings = SharedOffers.formatNumber(
			offer.savings - ((finalPrice - parseFloat(offer.price)) * 12)
		);
		offer.computedSavingsTextColor = SharedOffers.getSavingsTextColor(offer.computedSavings);
		offer.computedSavingsUnits = SharedOffers.getSavingsUnit(offer.computedSavings);
		offer.computedSavings = Math.round(offer.computedSavings);

		SharedOffers.selectedOffer = offer;
	},
	getModifiedOptions: () => {
		const impacts = {}

		for (let categoryOptions of SharedOffers.selectedOffer.options) {
			for (let option of categoryOptions.options) {
				const impact = this.getSelectedImpactOfOption(option);

				if (impact == null)
					continue;

				if (impact.impact != 0 && option.label !== undefined && impact.value) {
					if (!isNaN(parseFloat(impact.value))) {
						impacts[option.label] = (parseFloat(impact.value) * 100).toString();
					} else {
						impacts[option.label] = impact.value;
					}
				}
			}
		}
		return impacts;
	},
	openModal: async (offer) => {
		this.setSelectedOffer(offer);
		this.formatOffer(offer);
		this.updatePricesImpacts(SharedOffers.selectedOffer);
		showModal(Modal_more_information.name);
	},
	openDescription: async (description_title) => {
		this.clicked_description_title = description_title;
		showModal(Modal_description.name);
	},
}