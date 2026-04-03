export default {
  airCallApiToken: "b2762e6cba714ab62d12d3d2062619e3",
  airCallApiId: "f63a4501eaf7134be9742cbc201a141c",
  Agent_Mattis: "1384120",
  Agent_Clement: "1391821",
  googleCalendar: "https://calendly.com/philippe-parreira/nouvelle-reunion",
	userPhoneNumber: phoneNumber.text,
	agentId: "",

  async fetchAvailableAgents() {
    const url = "https://api.aircall.io/v1/users/availabilities";
    const credentials = `${this.airCallApiId}:${this.airCallApiToken}`;
    const encodedCredentials = btoa(credentials);

    const headers = {
      Authorization: `Basic ${encodedCredentials}`,
    };

    const response = await fetch(url, { headers });
    const data = await response.json();
    return data.users.filter(user => user.availability === "available");
  },

  async startOutboundCall() {
		closeModal(confirm_phone.name);
		showModal(LoadingAirCall.name);
    
		const url = `https://api.aircall.io/v1/users/${this.agentId}/calls`;
    const credentials = `${this.airCallApiId}:${this.airCallApiToken}`;
    const encodedCredentials = btoa(credentials);

    const headers = {
      Authorization: `Basic ${encodedCredentials}`,
      "Content-Type": "application/json",
    };

    const body = {
      number_id: 292022,
      to: this.userPhoneNumber,
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (response.status === 204) {
      showAlert(`Un de nos conseiller vous appelle sur le ${this.userPhoneNumber} !`, "success");
      return true;
    } else {
      showAlert("Il y a un soucis avec votre numéro, vous pouvez prendre un RDV.", "info");
			showModal(takeRDVModal.name)
      return false;
    }
  },

  async requestAirCall() {
    try {
      const agents = await this.fetchAvailableAgents();

      if (agents.length === 0) {
				showAlert("Aucun agent disponible")
				showModal(takeRDVModal.name)
        return;
      }

      const selectedAgent =
        agents.find(agent => agent.id === this.Agent_Mattis) ||
        agents.find(agent => agent.id === this.Agent_Clement) ||
        agents[0];
			
			this.agentId = selectedAgent.id;

			if (selectedAgent) {
				showModal(confirm_phone.name);
			} else {
				showAlert("Vous pouvez prendre un RDV", "info");
        showModal(takeRDVModal.name)
			}

    } catch (e) {
      showAlert("Erreur lors de l'appel d'agent Aircall", "error");
        showModal(takeRDVModal.name)
      console.error(e);
    }
  },
}