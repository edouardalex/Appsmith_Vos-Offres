export default {
	timeoutId: null,
	intervalId: null,
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
		const POLLING_DURATION = 5000; // 5 secondes
		const MAX_POLLING_DURATION = 30 * 60 * 1000; // 30 minutes

		if (!appsmith.URL.queryParams?.offerRunId) {
			console.log("Page ouverte sans données (aucun offerRunId). La récupération d'offres ne sera pas lancée.");
			return; 
		}

		await this.refreshOffers();

		const offers = getSharedPotentialOffers.data?.getSharedPotentialOffers ?? getSharedPotentialOffers.data?.data?.getSharedPotentialOffers;
		if (offers?.some(o => o.isLastBatch)) {
			return; 
		}

		this.intervalId = setInterval(async () => {
			showAlert("🔃 Actualisation des offres...", 'success')
			await this.refreshOffers();
		}, POLLING_DURATION);

		this.timeoutId = setTimeout(() => {
			console.log("Timeout de 30 min atteint. Arrêt du polling.");
			clearInterval(this.intervalId);
			this.intervalId = null;
		}, MAX_POLLING_DURATION);
	},
	async refreshOffers() {
		try {
			if (!appsmith.URL.queryParams?.offerRunId) return;

			await getSharedPotentialOffers.run({
				offerRunId: appsmith.URL.queryParams.offerRunId,
			});

			const offers = getSharedPotentialOffers.data?.getSharedPotentialOffers ?? getSharedPotentialOffers.data?.data?.getSharedPotentialOffers;

			this.offersData = this.prepareOffersData(offers);
			this.selectedOfferIds["offerRunId"] = this.offersData.offerRunId;
			this.selectedOfferIds["procedureId"] = this.offersData.procedureId;
			this.featuredOffers = {
				...this.offersData,
				featuredOffersShownOptions: Constants.featuredOffersShownOptions,
				offers: this.offersData.offers.filter(
					(offer) => offer.specialState != "NOT_SPECIAL"
				),
			};

			if (offers?.some(o => o.isLastBatch)) {
				showAlert("🎊 Dernières offres reçues", 'success')
				clearInterval(this.intervalId);
				clearTimeout(this.timeoutId);
				this.intervalId = null;
				this.timeoutId = null;
			}
		}
		catch (error) {
			console.log("refreshOffers :: erreur dans l'actualisation des résultats")
		}
	},
	prepareOffersData(sharedOffers) {
		console.log("Brut API:", sharedOffers)
		if (!sharedOffers || sharedOffers.length === 0) {
			return { offers: [] }; 
		}
		const result = {
			disableOfferSelection: false,
			choosenOffer: null,
			procedureId: sharedOffers[0].procedureId,
			firstName: sharedOffers[0].userFirstName,
			offerRunId: sharedOffers[0].runId,
			icons: Constants.icons,
			colors: Constants.colors,
			allOffersShownOptions: Constants.allOffersShownOptions,
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
			// 1. Appel API pour valider le choix en base de données
			await setPotentialOfferAsChosen.run({
				...this.selectedOfferIds,
				...(isCustomized
						? { customOptions: JSON.stringify(modifiedOptions) }
						: {}),
			});

			// 2. Sauvegardes propres dans la mémoire d'Appsmith
			// On stocke le procedureId de façon simple pour ta page de confirmation
			storeValue('procedureId', this.selectedOfferIds.procedureId || this.offersData.procedureId);

			// On stocke aussi l'offre choisie au cas où
			storeValue('monOffreChoisie', {
				...(this.selectedOffer || {}), 
				...this.selectedOfferIds
			});

			// 3. Fermeture de la modale proprement
			closeModal(Modal_Confirmation.name); 

			// 4. Redirection vers la page finale
			navigateTo("confirm habitation", {});

		} catch (error) {
			showAlert(
				"Oups... Une erreur est survenue lors de la sélection de l'offre !", 
				"error"
			);
		} finally {
			this.offersData.disableOfferSelection = false;
		}
	}
}