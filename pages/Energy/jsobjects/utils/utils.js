export default {
	isElectricity(subcategory) {
		return ["electricite", "electricite_et_gaz"].includes(subcategory);
	},
	isGaz(subcategory) {
		return ["gaz", "electricite_et_gaz"].includes(subcategory);
	},
	isBase(mode) {
		return ["basique","tempo","je_ne_sais_pas"].includes(mode);
	},
	isHpHc(mode) {
		return mode === "heures_pleines_et_heures_creuses";
	},
	mode: appsmith.URL.queryParams.mode,
	subcategoy: appsmith.URL.queryParams.subcategory,
	partnerLabel: appsmith.URL.queryParams.partnerLabel,
	async initPage() {
		if (this.isElectricity(this.subcategoy)) {
			await getElectricityPrices.run();
		}
		if (this.isGaz(this.subcategoy)) {
			await getGazPrices.run();
		}
		this.getPageData();
	},
	colorMap: {
		vattenfall: "#AAE3FF",
		alpiq_energie: "#000000",
		elmy_energie: "#00FB8A",
		ohm_energie: "#00FB8A"
	},
	pageData: {},
	nameMap: {
		vattenfall: "Vattenfall",
		alpiq_energie: "Alpiq",
		elmy_energie: "Elmy",
		ohm_energie: "OHM"
	},
	electricityPartners: ["vattenfall", "alpiq_energie", "ohm_energie"],
	gazPartners: ["vattenfall", "ohm_energie"],
	defaultKva: 6,
	findElectricityPartner(partnerLabel) {
		const partner = getElectricityPrices.data.find((item) => item.partnerLabel === partnerLabel);
		return partner || getElectricityPrices.data.find((item) => item.partnerLabel === 'edf');
	},
	findGazPartner(partnerLabel) {
		const partner = getGazPrices.data.find((item) => item.partnerLabel === partnerLabel);
		return partner || getGazPrices.data.find((item) => item.partnerLabel === 'edf');
	},
	p: "?partnerLabel=edf&annualPrice=12000&subcategory=electricite&mode=base&procedureId=hhhhh&email=aymen@ideel.io",
	getPageData() {
		const oldPartnerData = {};
		if (this.isElectricity(this.subcategoy)) oldPartnerData.electricity = this.findElectricityPartner(this.partnerLabel);
		if (this.isGaz(this.subcategoy)) oldPartnerData.gaz = this.findGazPartner(this.partnerLabel);
		const oldAnnualPrice = parseInt(appsmith.URL.queryParams.annualPrice);
		const mode = appsmith.URL.queryParams.mode;
		let oldKwhPrice = 0;
		if (oldPartnerData.electricity && this.isBase(mode)) oldKwhPrice += oldPartnerData.electricity.kwh;
		if (oldPartnerData.electricity && this.isHpHc(mode)) oldKwhPrice += (oldPartnerData.electricity.kwhHC + oldPartnerData.electricity.kwhHP) / 2;
		if (oldPartnerData.gaz) oldKwhPrice += oldPartnerData.gaz.kwh;
		oldKwhPrice = oldKwhPrice / Object.keys(oldPartnerData).length;
		let partnersToUse = [];
		if (this.isGaz(this.subcategoy)) partnersToUse = this.gazPartners;
		if (this.isElectricity(this.subcategoy)) partnersToUse = this.electricityPartners;
		if (this.isGaz(this.subcategoy) && this.isElectricity(this.subcategoy)) partnersToUse = this.gazPartners.filter((item) => this.electricityPartners.includes(item));
		const partners = partnersToUse.map((partner) => {
			const partnerData = {};
			if (this.isElectricity(this.subcategoy)) partnerData.electricity = this.findElectricityPartner(partner);
			if (this.isGaz(this.subcategoy)) partnerData.gaz = this.findGazPartner(partner);
			let newComparekwh = 0;
			if (partnerData.electricity && this.isBase(mode)) newComparekwh += partnerData.electricity.kwh;
			if (partnerData.electricity && this.isHpHc(mode)) newComparekwh += (partnerData.electricity.kwhHC + partnerData.electricity.kwhHP) / 2;
			if (partnerData.gaz) newComparekwh += partnerData.gaz.kwh;
			newComparekwh = newComparekwh / Object.keys(partnerData).length;

			const result = {
				name: this.nameMap[partner],
				color: this.colorMap[partner],
				label: partner,
				offerName: partnerData.electricity?.Offre || partnerData.gaz?.Offre,
			};

			
			if (partnerData.electricity && this.isBase(mode)) {
				result.electricityPrice = `${(partnerData.electricity.prix / 100).toFixed(2)}€`;
				result.electricityKwhPrice = `${(partnerData.electricity.kwh / 100 / 100).toFixed(4)}€`;
			}
			if (partnerData.electricity && this.isHpHc(mode)) {
				result.electricityPrice = `${(partnerData.electricity["prix abo HPHC"] / 100).toFixed(2)}€`;
				result.electricityKwhPriceHp = `${(partnerData.electricity["prix kwh HP"] / 100 / 100).toFixed(4)}€`;
				result.electricityKwhPriceHc = `${(partnerData.electricity["prix kwh HC"] / 100 / 100).toFixed(4)}€`;
			}
			if (partnerData.gaz) {
				result.gazPrice = `${(partnerData.gaz.prix / 100).toFixed(2)}€`;
				result.gazKwhPrice = `${(partnerData.gaz.kwh / 100 / 100).toFixed(4)}€`;
			}


			if (oldKwhPrice) {
				const anualConsomationKwh = oldAnnualPrice / oldKwhPrice;
				const percentageDifference = Math.round(((oldKwhPrice - newComparekwh) / oldKwhPrice) * 100);
				const diffColor = percentageDifference < 0 ? "#E6007E" : "#5CBF86";
				const diffAbs = Math.abs(percentageDifference);
				const priceText = `${((newComparekwh * anualConsomationKwh / 12) / 100).toFixed(2)}€ / mois`;

				const diffWordAmount = percentageDifference < 0 ? "de surcoût" : "d'économies";
				const diffAmount = Math.round(oldAnnualPrice * diffAbs / 100 / 100) + 20;
				const diffAmountText = `${diffAmount}€ ${diffWordAmount}`;

				const diffPercentageSign = percentageDifference < 0 ? "+" : "-";
				const diffPercentageText = `${diffPercentageSign}${diffAbs}%`
				
				
				if (partnerData.electricity) {
					const electricityPercentageDiff = Math.round(((oldKwhPrice - partnerData.electricity.kwh) / oldKwhPrice) * 100);
          const electricityDiffAbs = Math.abs(electricityPercentageDiff);
          const electricityDiffSign = electricityPercentageDiff < 0 ? "+" : "-";
          result.diffPercentageText = `${electricityDiffSign}${electricityDiffAbs}%`;
				}
				if (partnerData.gaz) {
          const gazPercentageDiff = Math.round(((oldKwhPrice - partnerData.gaz.kwh) / oldKwhPrice) * 100);
          const gazDiffAbs = Math.abs(gazPercentageDiff);
          const gazDiffSign = gazPercentageDiff < 0 ? "+" : "-";
          result.gazDiffPercentageText = `${gazDiffSign}${gazDiffAbs}%`;
         }


				result.priceText = priceText;
				result.diffAmountText = diffAmountText;
				console.log('diffPercentageText', diffPercentageText)
				result.diffPercentageText = diffPercentageText;
				result.priceColor = diffColor;
			}

			return result;
		});

		this.pageData = { partners };
	},
	dataToSend: {},
	currentSelectedPartner: "",
	handleOfferChosen(partner) {
		this.currentSelectedPartner = partner;
		showModal(Modal_Confirmation.name);
	},
	async confirmOfferChoice() {
		const partner = this.currentSelectedPartner;
		if (!partner) return await showAlert("Pas de selection !", "error");

		const dataToSend = {
			date: new Date(),
			"id de la demarche": appsmith.URL.queryParams.procedureId,
			email: appsmith.URL.queryParams.email,
			partenaire: this.nameMap[partner],
			"sous categorie": this.subcategoy,
			"ancien prix annuel": `${(appsmith.URL.queryParams.annualPrice / 100).toFixed(2)}€`,
		};

		this.dataToSend = dataToSend;
		await Add_accepted_offer.run();
		await moveProcedureToOfferValidation.run()
		return navigateTo("confirm Energy", {});
	},


	endpoints: {
		prince: "https://a3n6vihuf3.execute-api.eu-west-1.amazonaws.com/prince/",
		staging: "https://n5j6f33icg.execute-api.eu-west-1.amazonaws.com/staging/",
		production: "https://gget4w2hb3.execute-api.eu-west-1.amazonaws.com/production/",
	},
	env: this.endpoints[appsmith.URL.queryParams.stage ?? "staging"],
}