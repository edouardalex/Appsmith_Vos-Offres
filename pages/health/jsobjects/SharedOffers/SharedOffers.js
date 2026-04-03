export default {
	offersData: {},
	featuredOffers: {},
	selectedOffer: null,
	selectedOfferIds: {},
	selectedOfferCustomOptions: null,
	formatNumber(num) {
		return Number.isInteger(num) ? num.toString() : num.toFixed(2);
	},
	getSavingsUnit: (savings) => (savings >= 0 ? "d'économies" : "de surcoût"),
	getOfferHeader: (specialState) => Constants.specialStateToText[specialState],
	getSavingsTextColor: (savings) => savings >= 0 ? Constants.colors.success : Constants.colors.failure,
	capitalizeFirstLetter: (str) => {
		return str.charAt(0).toUpperCase() + str.slice(1);
	},
	chosenOfferWarning: () => {
		if (!this.offersData.disableOfferSelection || !this.offersData.choosenOffer)
			return "";

		const { name, partner } = this.offersData.choosenOffer;
		const warningText = `<div style='background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; padding: 10px; border-radius: 5px;'> <strong>Attention :</strong> Une offre (${name} ${partner}) est déjà sélectionnée dans cette démarche d'optimisation.<br>Vous ne pouvez pas en sélectionner une nouvelle !</div>`;
		return warningText;
	},
	async initPage() {
		await getSharedPotentialOffers.run({
			offerRunId: appsmith.URL.queryParams.offerRunId,
		});

		this.offersData = this.prepareOffersData(
			getSharedPotentialOffers.data.data?.getSharedPotentialOffers
		);
		this.selectedOfferIds["offerRunId"] = this.offersData.offerRunId;
		this.selectedOfferIds["procedureId"] = this.offersData.procedureId;
		this.featuredOffers = {
			...this.offersData,
			featuredOffersShownOptions: Constants.featuredOffersShownOptions,
			offers: this.offersData.offers.filter(
				(offer) => offer.specialState != "NOT_SPECIAL"
			),
		};
	},
	prepareOffersData(sharedOffers) {
		const result = {
			disableOfferSelection: false,
			choosenOffer: null,
			procedureId: sharedOffers[0].procedureId,
			firstName: sharedOffers[0].userFirstName,
			offerRunId: sharedOffers[0].runId,
			icons: Constants.icons,
			colors: Constants.colors,
			allOffersShownOptions: Constants.allOffersShownOptions,
			offerOptionsIcons: Constants.offerOptionsIcons,
			offers: [],
		};

		sharedOffers.forEach((offer) => {
			if (offer.state === "CHOSEN") {
				result.choosenOffer = offer;
				result.disableOfferSelection = true;
			}
			const savings = Math.round(this.formatNumber(offer.savings / 100));

			const formattedOffer = {
				name: this.capitalizeFirstLetter(offer.name),
				is_estimation: offer.price < 0,
				price: this.formatNumber(offer.price / 100),
				impacted_price: this.formatNumber(offer.price / 100),
				savings: Math.abs(savings),
				priceUnit: "€ par mois",
				savingsUnit: this.getSavingsUnit(savings),
				savingsTextColor: this.getSavingsTextColor(savings),
				specialState: offer.specialState,
				state: offer.state,
				offerId: offer.id,
				header_text: this.getOfferHeader(offer.specialState),
				information_paper: offer.informationPaperUrl,
				partner: {
					name: Constants.partnerName[offer.partner],
					color: Constants.colorMap[offer.partner],
					logo: `https://s3.eu-west-3.amazonaws.com/ideel.images/logos/${offer.partner}.png`,
				},
				options: offer.options,
			};
			result.offers.push(formattedOffer);
		});
		return result;
	},
	handleOfferChosen(offerId, offerRunId, procedureId) {
		this.selectedOfferIds = { offerId, offerRunId, procedureId };
		showModal(Modal_Confirmation.name);
	},
	async confirmOfferChoice() {
		this.offersData.disableOfferSelection = true;
		const modifiedOptions = ModalMoreInformation.getModifiedOptions();
		const isCustomized = Object.keys(modifiedOptions).length !== 0;

		try {
			if (this.selectedOffer == null) throw Error();

			await setPotentialOfferAsChosen.run({
				...this.selectedOfferIds,
				...(isCustomized
						? { customOptions: JSON.stringify(modifiedOptions) }
						: {}),
			});
			navigateTo("confirm habitation", {});
		} catch (error) {
			showAlert(
				"Oups... Une erreur est survenue lors de la sélection de l'offre !"
			);
		} finally {
			this.offersData.disableOfferSelection = false;
		}
	},
}