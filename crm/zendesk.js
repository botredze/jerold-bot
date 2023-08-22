const Logs = require("../model/Logs");
const zendeskAxios = require("../crm/config");


const createContact = async (contactData) => {
  try {
    const response = await zendeskAxios.post("/contacts", {
      headers: {
        "Content-Type": "application/json"
      },
      data: contactData
    });

    return response.data;
  } catch (error) {
    await Logs.create(null, "contact-create", null, error, null);
   // throw error;
  }
}; //success

const createLead = async (leadData) => {
  try {
    if (leadData) {
      const response = await zendeskAxios.post("/leads", { data: leadData });

      return response.data;
    } else {
      throw new Error("Data object empty");
    }
  } catch (error) {
    await Logs.create(null, "lead-create", null, error, null);
    //throw  error;
  }
}; //success

const getLeadById = async (id) => {
  try {
    const response = await zendeskAxios.get(`/leads/${id}`);
    const leads = response.data;
    return leads;
  } catch (err) {
    await Logs.create(null, "lead-get", null, err, null);
    console.log(err);
    throw  err;
  }
};// success

const getContactById = async (id) => {
  try {
    const response = await zendeskAxios.get(`/contacts/${id}`);
    return response.data;
  } catch (error) {
    await Logs.create(null, "contact-get", null, error, null);
    //throw error;
  }
};

//Get contact List
const getContacts = async () => {
  try {
    const response = await zendeskAxios.get("/contacts");
    return response.data;
  } catch (error) {
    await Logs.create(null, "contact-get", null, error, null);
   // throw error;
  }
};//sucess

const getDeals = async () => {
  try {
    const response = await zendeskAxios.get("/deals");
    return response.data;
  } catch (error) {
    await Logs.create(null, "deals-get", null, error, null);
    //throw  error;
  }
};

const getDealById = async (id) => {
  try {
    const response = await zendeskAxios.get(`/deals${id}`);
    if (response) {
      return response.data;
    } else {
      throw  new Error("Deal not found");
    }
  } catch (error) {
    await Logs.create(null, "deals-get", null, error, null);
   // throw new Error("Internal Server Error: " + error.message);
  }
};

const createDeal = async (dealData) => {
  try {
    if (dealData) {
      const response = await zendeskAxios.post("/deals", { data: dealData });
      return response.data;
    } else {
      throw new Error("Deals data empty");
    }
  } catch (err) {
    await Logs.create(null, "deal-create", null, err, null);
    //console.log("Error getting contacts:", err.response.data)
   // throw  err;
  }
};  //success

const updateDeal = async (dealID, updateDealData) => {
  try {
    if (updateDealData && dealID) {
      const response = await zendeskAxios.put(`/deals/${dealID}`, { data: updateDealData });
      return response.data;
    } else {
      throw new Error("Deals data empty");
    }
  } catch (err) {
    await Logs.create(null, "deal-update", null, err, null);
    //console.log("Error getting contacts:", err.response.data);
   // throw err;
  }
}; //success


const updateLead = async (leadID, updateLeadData) => {
  try {
    if (leadID && updateLeadData) {
      const response = await zendeskAxios.put(`/leads/${leadID}`, { data: updateLeadData });
      return response.data;
    } else {
      throw new Error("Lead data empty");
    }
  } catch (err) {
    await Logs.create(null, "lead-update", null, err, null);
    // console.log("Error update Lead:", err);

   // throw err;
  }
}; //success

const updateContact= async (contactId, updateContactData) => {
  try {
    if (contactId && updateContactData) {
      const response = await zendeskAxios.put(`/contacts/${contactId}`, { data: updateContactData });
      return response.data;
    } else {
      throw new Error("Lead data empty");
    }
  } catch (err) {
    await Logs.create(null, "lead-update", null, err, null);
    // console.log("Error update Lead:", err);

    // throw err;
  }
}; //success


const getLeadByEmail = async (email) => {
  try {
    if (email) {
      const response = await zendeskAxios.get(`/leads?email=${email}`);
      const leads = response.data;
      if (leads.items.length > 0) {
        return leads.items[0];
      }
    } else {
      throw new Error("Search parameters empty");
    }
  } catch (err) {
    await Logs.create(null, "lead-get", null, err, null);
    //console.log(err);
    //throw  err;
  }
};//success

const getLeadByPhone = async (phone) => {
  try {
    if (phone) {
      const response = await zendeskAxios.get(`/leads?phone=${phone}`);
      const leads = response.data;
      console.log(leads);
      if (leads.items.length > 0) {
        return leads.items[0];
      }
    } else {
      throw new Error("Search parameters empty");
    }
  } catch (err) {
    await Logs.create(null, "lead-get", null, err, null);
    //console.log(err);
   // throw  err;
  }
};//success

const getContactByPhone = async (phone) => {
  try {
    if (phone) {
      const response = await zendeskAxios.get(`/contacts?phone=${phone}`);
      const leads = response.data;
      console.log(leads);
      if (leads.items.length > 0) {
        return leads.items[0];
      }
    } else {
      throw new Error("Search parameters empty");
    }
  } catch (err) {
    await Logs.create(null, "contact-get", null, err, null);
    //console.log(err);
   // throw  err;
  }
};//success

const getContactByEmail = async (email) => {
  try {
    if (email) {
      const response = await zendeskAxios.get(`/contacts?email=${email}`);
      const leads = response.data;
      if (leads.items.length > 0) {
        return leads.items[0];
      }
    } else {
      throw new Error("Search parameters empty");
    }
  } catch (err) {
    await Logs.create(null, "contact-get", null, err, null);
    //console.log(err);
   // throw  err;
  }
};//success

const getContactByName = async (name) => {
  try {
    if (name) {
      const response = await zendeskAxios.get(`/contacts?name=${name}`);
      const leads = response.data;
      if (leads.items.length > 0) {
        return leads.items[0];
      }
    } else {
      throw new Error("Search parameters empty");
    }
  } catch (err) {
    await Logs.create(null, "contact-get", null, err, null);
    //console.log(err);
   // throw  err;
  }
};//success

const searchPerson = async (email, phone, name, product) => {
  try {
    let persons = [];
    if (email) {
      try {
        const person = await getContactByEmail(email);
        persons.push(person)
      } catch (error) {
        await Logs.create(email, "search-person", null, error, null);
      }
    }

    if (!persons.length && phone) {
      try {
        const person = await getContactByPhone(phone);
        persons.push(person)
      } catch (error) {
       await Logs.create(phone, "search-person", null, error, null);
      }
    }

    if(persons.length && phone) {
      persons.map(async (person) => {
        if(!person.data.phone) {
          const updateData = {
            ...person,
            phone: phone
          }
          const updatedPerson  = await updateContact(person.data.id, updateData)
          persons.push(updatedPerson)
        }
      })
    }

    if (email && phone) {
      persons = persons.filter((person => person.data.email === email))
    }
    if (!persons.length) {
      try {
        const contactData = {
          name: name,
          last_name: name,
          email: email,
          phone: phone,
          description: `Jerold ${product.name}`
        };

        persons[0] = await createContact(contactData);
        return persons[0];
      } catch (error) {
        await Logs.create(null, "crm-error", "crm", null, error, null, "searchPerson");
      }

    }
    return persons[0];
  } catch (error) {
   await Logs.create(null, "search-person",null, error, null);
  //  throw error;
  }
};


module.exports = {
  createContact,
  createLead,
  getContacts,
  updateDeal,
  createDeal,
  getLeadById,
  updateLead,
  getContactById,
  getDealById,
  getDeals,
  getLeadByEmail,
  getLeadByPhone,
  searchPerson,
  getContactByPhone,
  getContactByEmail,
  updateContact
};
