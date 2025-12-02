
import { db, auth } from '../firebase';
import { Rabbit, RabbitStatus, Sex, Transaction, TransactionType, Hutch, Crossing, CrossingStatus, Delivery, Sale, Farm, UserProfile, MedicalRecord, HutchOccupancy, AppNotification, WeightRecord, Customer } from '../types';

// Default Settings Fallback
const DEFAULT_SETTINGS = {
  gestationDays: 31,
  palpationDays: 14,
  weaningDays: 35
};

// --- MOCK STORAGE FOR DEMO MODE ---
// If the user is in "Demo Mode", we use this in-memory store instead of Firestore
let MOCK_STORE: any = {
  farms: {},
  rabbits: [],
  hutches: [],
  transactions: [],
  crossings: [],
  deliveries: [],
  medical: [],
  occupancy: [],
  notifications: [],
  weights: [],
  customers: []
};

// Check if we are in Demo Mode (auth.currentUser is null but we proceeded)
// OR if using the explicit mock flag
const isDemoMode = () => {
  return !auth.currentUser; // Simple check: If no firebase user, assume demo
};

// Helper to get current authenticated user ID
const getUserId = () => {
  if (isDemoMode()) return 'demo-user-123';
  if (!auth.currentUser) {
    throw new Error("User must be logged in to access farm data.");
  }
  return auth.currentUser.uid;
};

// Helper to get the Farm ID for the current user
const getFarmId = () => {
  return `farm-${getUserId()}`;
};

// Helper to convert Firestore timestamp to ISO date string
const convertDoc = (doc: any): any => {
  const data = doc.data();
  const result = {
    id: doc.id,
    ...data,
  };

  // Convert timestamps to ISO strings only if they exist
  const dateFields = [
    'dateOfBirth', 
    'dateOfAcquisition', 
    'dateOfCrossing', 
    'expectedDeliveryDate', 
    'expectedPalpationDate', 
    'actualDeliveryDate',
    'dateOfDelivery',
    'date',
    'nextDueDate',
    'startAt',
    'endAt',
    'createdAt',
    'lastPurchaseDate'
  ];

  dateFields.forEach(field => {
    if (result[field] && typeof result[field].toDate === 'function') {
      result[field] = result[field].toDate().toISOString().split('T')[0];
    }
  });

  if (result.createdAt && typeof result.createdAt.toDate === 'function') {
    result.createdAt = result.createdAt.toDate();
  }
  
  return result;
};

export const FarmService = {
  // --- User & Onboarding ---

  async syncUser(user: any): Promise<void> {
    if (isDemoMode()) return;
    try {
      const userRef = db.collection('users').doc(user.uid);
      const payload: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: new Date().toISOString()
      };
      await userRef.set(payload, { merge: true });
    } catch (e) {
      console.error("Failed to sync user profile:", e);
    }
  },

  async getFarm(): Promise<Farm | null> {
    if (isDemoMode()) {
       // Return a mock farm so demo mode skips onboarding
       return {
         farmId: 'farm-demo',
         name: 'Demo Rabbitry',
         ownerUid: 'demo-user-123',
         timezone: 'UTC',
         currency: 'USD',
         defaultGestationDays: 31,
         defaultWeaningDays: 35,
         defaultPalpationDays: 14,
         createdAt: new Date()
       };
    }

    // Strict check: if no auth, return null immediately
    if (!auth.currentUser) return null;

    try {
      const farmId = getFarmId();
      // Optimization: catch permission-denied errors which mean doc doesn't exist
      try {
        const doc = await db.collection('farms').doc(farmId).get();
        if (doc.exists) {
          return convertDoc(doc) as Farm;
        }
      } catch (err: any) {
        if (err.code === 'permission-denied') return null;
        throw err;
      }
    } catch (error: any) {
      // If permission denied or other error, assume no farm setup yet
      console.log("Farm check result:", error.code);
    }
    return null;
  },

  async createFarm(settings: { name: string, currency: string, timezone: string }): Promise<void> {
    const userId = getUserId();
    const farmId = getFarmId();
    
    if (isDemoMode()) return; // Should not happen in demo flow really

    await db.collection('farms').doc(farmId).set({
      farmId: farmId,
      ownerUid: userId,
      name: settings.name,
      currency: settings.currency,
      timezone: settings.timezone,
      defaultGestationDays: DEFAULT_SETTINGS.gestationDays,
      defaultWeaningDays: DEFAULT_SETTINGS.weaningDays,
      defaultPalpationDays: DEFAULT_SETTINGS.palpationDays,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  // --- Farm Settings ---

  async getFarmSettings(): Promise<Farm> {
    const farm = await this.getFarm();
    if (farm) return farm;

    // Fallback if accessed before creation (should be handled by Onboarding gate)
    return {
      farmId: getFarmId(),
      name: 'My Rabbit Farm',
      ownerUid: getUserId(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currency: 'USD',
      defaultGestationDays: DEFAULT_SETTINGS.gestationDays,
      defaultWeaningDays: DEFAULT_SETTINGS.weaningDays,
      defaultPalpationDays: DEFAULT_SETTINGS.palpationDays,
      createdAt: new Date()
    };
  },

  async updateFarmSettings(settings: Partial<Farm>): Promise<void> {
    if (isDemoMode()) return;
    const farmId = getFarmId();
    await db.collection('farms').doc(farmId).set({
      ...settings,
      farmId: farmId, // Ensure ID is set
      ownerUid: getUserId(), // Ensure ownership
      updatedAt: new Date()
    }, { merge: true });
  },

  async exportFarmData(): Promise<any> {
    const rabbits = await this.getRabbits();
    const hutches = await this.getHutches();
    const crossings = await this.getCrossings();
    const transactions = await this.getTransactions();
    const medical = await this.getMedicalRecords();
    const customers = await this.getCustomers();
    
    return {
      farmId: getFarmId(),
      exportedAt: new Date().toISOString(),
      rabbits,
      hutches,
      crossings,
      transactions,
      medical,
      customers
    };
  },

  // --- Rabbits ---

  async getRabbits(): Promise<Rabbit[]> {
    if (isDemoMode()) return MOCK_STORE.rabbits;
    try {
      const farmId = getFarmId();
      const snapshot = await db.collection(`farms/${farmId}/rabbits`)
        .orderBy('createdAt', 'desc')
        .get();
      return snapshot.docs.map(doc => convertDoc(doc) as Rabbit);
    } catch (error) {
      console.error("Error fetching rabbits:", error);
      throw error;
    }
  },

  async getRabbitDetails(rabbitId: string): Promise<{
    rabbit: Rabbit;
    offspring: Rabbit[];
    medical: MedicalRecord[];
    history: HutchOccupancy[];
    pedigree: { sire?: Rabbit, doe?: Rabbit };
    litters: Crossing[];
    weights: WeightRecord[];
  }> {
    if (isDemoMode()) {
       const rabbit = MOCK_STORE.rabbits.find((r: any) => r.id === rabbitId);
       return { 
           rabbit, 
           offspring: [], 
           medical: MOCK_STORE.medical.filter((m: any) => m.rabbitId === rabbit.tag),
           history: MOCK_STORE.occupancy.filter((o: any) => o.rabbitId === rabbit.id),
           weights: MOCK_STORE.weights.filter((w: any) => w.rabbitId === rabbit.tag),
           pedigree: {},
           litters: []
       };
    }

    const farmId = getFarmId();
    
    // 1. Get Rabbit
    const rabbitRef = db.collection(`farms/${farmId}/rabbits`).doc(rabbitId);
    const rabbitDoc = await rabbitRef.get();
    if (!rabbitDoc.exists) throw new Error("Rabbit not found");
    const rabbit = convertDoc(rabbitDoc) as Rabbit;

    // 2. Parallel Fetching
    const [medicalSnap, historySnap, offspringSnap, littersSnap, weightSnap] = await Promise.all([
        db.collection(`farms/${farmId}/medical`).where('rabbitId', '==', rabbit.tag).get(),
        db.collection(`farms/${farmId}/hutchOccupancy`).where('rabbitId', '==', rabbitId).get(),
        // Finding offspring
        db.collection(`farms/${farmId}/rabbits`).where(
            rabbit.sex === Sex.Female ? 'parentage.doeId' : 'parentage.sireId', 
            '==', 
            rabbit.tag
        ).get(),
        // Finding matings
        db.collection(`farms/${farmId}/crossings`).where(
            rabbit.sex === Sex.Female ? 'doeId' : 'sireId',
            '==',
            rabbit.tag
        ).get(),
        db.collection(`farms/${farmId}/weights`).where('rabbitId', '==', rabbit.tag).get()
    ]);

    // 3. Fetch Parents (Pedigree)
    let sire, doe;
    if (rabbit.parentage.sireId) {
        const sSnap = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', rabbit.parentage.sireId).get();
        if (!sSnap.empty) sire = convertDoc(sSnap.docs[0]) as Rabbit;
    }
    if (rabbit.parentage.doeId) {
        const dSnap = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', rabbit.parentage.doeId).get();
        if (!dSnap.empty) doe = convertDoc(dSnap.docs[0]) as Rabbit;
    }

    return {
        rabbit,
        medical: medicalSnap.docs.map(doc => convertDoc(doc) as MedicalRecord)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        history: historySnap.docs.map(doc => convertDoc(doc) as HutchOccupancy)
            .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
        offspring: offspringSnap.docs.map(doc => convertDoc(doc) as Rabbit),
        litters: littersSnap.docs.map(doc => convertDoc(doc) as Crossing)
            .sort((a, b) => new Date(b.dateOfCrossing).getTime() - new Date(a.dateOfCrossing).getTime()),
        weights: weightSnap.docs.map(doc => convertDoc(doc) as WeightRecord)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        pedigree: { sire, doe }
    };
  },

  async getRabbitsBySex(sex: Sex): Promise<Rabbit[]> {
    if (isDemoMode()) return MOCK_STORE.rabbits.filter((r: Rabbit) => r.sex === sex);
    try {
      const farmId = getFarmId();
      const snapshot = await db.collection(`farms/${farmId}/rabbits`)
        .where('sex', '==', sex)
        .where('status', 'in', ['Alive', 'Pregnant', 'Weaned'])
        .get();
      return snapshot.docs.map(doc => convertDoc(doc) as Rabbit);
    } catch (error) {
      console.error(`Error fetching ${sex} rabbits:`, error);
      return [];
    }
  },

  async getSaleableRabbits(): Promise<Rabbit[]> {
    if (isDemoMode()) return MOCK_STORE.rabbits.filter((r: Rabbit) => ['Alive', 'Weaned', 'Pregnant'].includes(r.status));
    try {
      const farmId = getFarmId();
      const snapshot = await db.collection(`farms/${farmId}/rabbits`)
        .where('status', 'in', [RabbitStatus.Alive, RabbitStatus.Weaned, RabbitStatus.Pregnant])
        .get();
      return snapshot.docs.map(doc => convertDoc(doc) as Rabbit);
    } catch (error) {
      console.error("Error fetching saleable rabbits:", error);
      return [];
    }
  },

  async addRabbit(
    rabbitData: Omit<Rabbit, 'id' | 'farmId' | 'rabbitId'>, 
    isPurchase: boolean,
    kitCount: number = 1
  ): Promise<void> {
    const userId = getUserId();
    const farmId = getFarmId();
    const timestamp = new Date();

    if (isDemoMode()) {
        for (let i = 0; i < kitCount; i++) {
            const id = 'mock-rabbit-' + Math.random();
            MOCK_STORE.rabbits.push({
                ...rabbitData,
                id,
                rabbitId: id,
                farmId,
                tag: kitCount > 1 ? `${rabbitData.tag}-${i+1}` : rabbitData.tag,
                createdAt: timestamp
            });
        }
        return;
    }

    const batch = db.batch();

    for (let i = 0; i < kitCount; i++) {
      const newRabbitRef = db.collection(`farms/${farmId}/rabbits`).doc();
      let finalTag = rabbitData.tag;
      if (kitCount > 1) {
        finalTag = `${rabbitData.tag}-${(i + 1)}`;
      }

      const docData = {
        ...rabbitData,
        tag: finalTag,
        rabbitId: newRabbitRef.id,
        farmId: farmId,
        ownerUid: userId,
        createdAt: timestamp,
        updatedAt: timestamp,
        dateOfBirth: rabbitData.dateOfBirth ? new Date(rabbitData.dateOfBirth) : null,
        dateOfAcquisition: rabbitData.dateOfAcquisition ? new Date(rabbitData.dateOfAcquisition) : timestamp,
      };

      batch.set(newRabbitRef, docData);

      if (rabbitData.weight && rabbitData.weight > 0) {
        const weightRef = db.collection(`farms/${farmId}/weights`).doc();
        batch.set(weightRef, {
            id: weightRef.id,
            rabbitId: finalTag,
            weight: rabbitData.weight,
            unit: 'kg',
            date: timestamp.toISOString(),
            ageAtRecord: 'Initial',
            notes: 'Initial weight on entry',
            farmId: farmId,
            ownerUid: userId
        });
      }

      if (isPurchase && i === 0 && rabbitData.purchaseCost && rabbitData.purchaseCost > 0) {
        const txnRef = db.collection(`farms/${farmId}/transactions`).doc();
        batch.set(txnRef, {
          id: txnRef.id,
          farmId: farmId,
          ownerUid: userId,
          type: TransactionType.Expense,
          category: 'Livestock Purchase',
          amount: rabbitData.purchaseCost * kitCount,
          date: new Date().toISOString(),
          relatedId: newRabbitRef.id,
          notes: `Purchase of ${kitCount} rabbit(s). Tag start: ${rabbitData.tag}`
        });
      }
      
      if (rabbitData.currentHutchId) {
         const hutchSnapshot = await db.collection(`farms/${farmId}/hutches`)
            .where('hutchId', '==', rabbitData.currentHutchId).get();
         
         if (!hutchSnapshot.empty) {
            const hutchDoc = hutchSnapshot.docs[0];
            const hutchRef = hutchDoc.ref;
            
            batch.update(hutchRef, { 
                currentOccupancy: (hutchDoc.data().currentOccupancy || 0) + 1 
            });

            const historyRef = db.collection(`farms/${farmId}/hutchOccupancy`).doc();
            batch.set(historyRef, {
                id: historyRef.id,
                rabbitId: newRabbitRef.id,
                hutchId: rabbitData.currentHutchId,
                hutchLabel: hutchDoc.data().label,
                startAt: timestamp,
                purpose: 'Housing',
                notes: 'Initial placement',
                farmId: farmId,
                ownerUid: userId,
                createdAt: timestamp
            });
         }
      }
    }

    await batch.commit();
  },

  async addBulkRabbits(
    baseData: Omit<Rabbit, 'id' | 'farmId' | 'rabbitId'>, 
    kits: { tag: string, sex: Sex, name: string, hutchId: string, breed?: string }[],
    isPurchase: boolean
  ): Promise<void> {
      const userId = getUserId();
      const farmId = getFarmId();
      const timestamp = new Date();
  
      if (isDemoMode()) {
          kits.forEach(k => {
              const id = 'mock-rabbit-'+Math.random();
              MOCK_STORE.rabbits.push({ ...baseData, ...k, id, rabbitId: id, farmId, createdAt: timestamp });
          });
          return;
      }
  
      const batch = db.batch();
  
      for (const kit of kits) {
          const newRabbitRef = db.collection(`farms/${farmId}/rabbits`).doc();
          
          const docData = {
              ...baseData,
              tag: kit.tag,
              sex: kit.sex,
              name: kit.name,
              breed: kit.breed || baseData.breed,
              currentHutchId: kit.hutchId,
              rabbitId: newRabbitRef.id,
              farmId: farmId,
              ownerUid: userId,
              createdAt: timestamp,
              updatedAt: timestamp,
              dateOfBirth: baseData.dateOfBirth ? new Date(baseData.dateOfBirth) : null,
              dateOfAcquisition: baseData.dateOfAcquisition ? new Date(baseData.dateOfAcquisition) : timestamp,
          };
  
          batch.set(newRabbitRef, docData);
  
          if (kit.hutchId) {
             const hutchSnapshot = await db.collection(`farms/${farmId}/hutches`)
                .where('hutchId', '==', kit.hutchId).get();
             
             if (!hutchSnapshot.empty) {
                const hutchDoc = hutchSnapshot.docs[0];
                batch.update(hutchDoc.ref, { currentOccupancy: (hutchDoc.data().currentOccupancy || 0) + 1 });
  
                const historyRef = db.collection(`farms/${farmId}/hutchOccupancy`).doc();
                batch.set(historyRef, {
                    id: historyRef.id,
                    rabbitId: newRabbitRef.id,
                    hutchId: kit.hutchId,
                    hutchLabel: hutchDoc.data().label,
                    startAt: timestamp,
                    purpose: 'Housing',
                    notes: 'Initial placement (Kit)',
                    farmId: farmId,
                    ownerUid: userId,
                    createdAt: timestamp
                });
             }
          }
      }
  
      await batch.commit();
  },

  async moveRabbit(rabbitId: string, targetHutchId: string | null, purpose: string, notes?: string): Promise<void> {
    const userId = getUserId();
    const farmId = getFarmId();
    const timestamp = new Date();

    if (isDemoMode()) {
       const r = MOCK_STORE.rabbits.find((r: any) => r.id === rabbitId);
       if (r) r.currentHutchId = targetHutchId;
       return;
    }

    const batch = db.batch();
    const rabbitRef = db.collection(`farms/${farmId}/rabbits`).doc(rabbitId);
    const rabbitDoc = await rabbitRef.get();
    
    if (!rabbitDoc.exists) throw new Error("Rabbit not found");
    const rabbitData = rabbitDoc.data() as Rabbit;

    // 1. Leave Current
    if (rabbitData.currentHutchId) {
        const occSnap = await db.collection(`farms/${farmId}/hutchOccupancy`)
            .where('rabbitId', '==', rabbitId)
            .where('hutchId', '==', rabbitData.currentHutchId)
            .where('endAt', '==', null)
            .get();
        occSnap.forEach(doc => { batch.update(doc.ref, { endAt: timestamp }); });

        const oldHutchSnap = await db.collection(`farms/${farmId}/hutches`)
            .where('hutchId', '==', rabbitData.currentHutchId).get();
        if (!oldHutchSnap.empty) {
            const currentVal = oldHutchSnap.docs[0].data().currentOccupancy || 0;
            batch.update(oldHutchSnap.docs[0].ref, { currentOccupancy: Math.max(0, currentVal - 1) });
        }
    }

    // 2. Enter New
    if (targetHutchId) {
        const newHutchSnap = await db.collection(`farms/${farmId}/hutches`)
            .where('hutchId', '==', targetHutchId).get();
        if (newHutchSnap.empty) throw new Error("Target hutch not found");
        const newHutchDoc = newHutchSnap.docs[0];
        
        batch.update(newHutchDoc.ref, { currentOccupancy: (newHutchDoc.data().currentOccupancy || 0) + 1 });

        const newOccRef = db.collection(`farms/${farmId}/hutchOccupancy`).doc();
        batch.set(newOccRef, {
            id: newOccRef.id,
            rabbitId: rabbitId,
            hutchId: targetHutchId,
            hutchLabel: newHutchDoc.data().label,
            startAt: timestamp,
            endAt: null,
            purpose: purpose,
            notes: notes || '',
            farmId: farmId,
            ownerUid: userId,
            createdAt: timestamp
        });
    }

    batch.update(rabbitRef, { currentHutchId: targetHutchId, updatedAt: timestamp });
    await batch.commit();
  },

  async updateRabbit(id: string, updates: Partial<Rabbit>): Promise<void> {
    if (isDemoMode()) {
        const idx = MOCK_STORE.rabbits.findIndex((r: Rabbit) => r.id === id);
        if (idx !== -1) MOCK_STORE.rabbits[idx] = { ...MOCK_STORE.rabbits[idx], ...updates };
        return;
    }
    const farmId = getFarmId();
    await db.collection(`farms/${farmId}/rabbits`).doc(id).update({
      ...updates,
      updatedAt: new Date()
    });
  },

  async recordMortality(
    rabbitId: string, 
    status: RabbitStatus.Dead | RabbitStatus.Slaughtered, 
    date: string, 
    notes: string, 
    soldAmount?: number
  ): Promise<void> {
    if (isDemoMode()) {
       const idx = MOCK_STORE.rabbits.findIndex((r: Rabbit) => r.id === rabbitId);
       if (idx !== -1) {
           MOCK_STORE.rabbits[idx].status = status;
           MOCK_STORE.rabbits[idx].currentHutchId = null;
       }
       return;
    }

    const userId = getUserId();
    const farmId = getFarmId();
    const batch = db.batch();
    const timestamp = new Date();

    const rabbitRef = db.collection(`farms/${farmId}/rabbits`).doc(rabbitId);
    const rabbitDoc = await rabbitRef.get();
    
    if (!rabbitDoc.exists) throw new Error("Rabbit not found");
    const rabbitData = rabbitDoc.data() as Rabbit;

    batch.update(rabbitRef, {
       status: status,
       currentHutchId: null,
       notes: (rabbitData.notes || '') + `\n[${status} on ${date}]: ${notes}`,
       updatedAt: timestamp
    });

    if (rabbitData.currentHutchId) {
       const hutchSnapshot = await db.collection(`farms/${farmId}/hutches`)
          .where('hutchId', '==', rabbitData.currentHutchId).get();
       if (!hutchSnapshot.empty) {
          batch.update(hutchSnapshot.docs[0].ref, { currentOccupancy: Math.max(0, (hutchSnapshot.docs[0].data().currentOccupancy || 1) - 1) });
       }
       const occSnap = await db.collection(`farms/${farmId}/hutchOccupancy`)
            .where('rabbitId', '==', rabbitId)
            .where('endAt', '==', null).get();
        occSnap.forEach(doc => { batch.update(doc.ref, { endAt: new Date(date) }); });
    }

    if (status === RabbitStatus.Slaughtered && soldAmount && soldAmount > 0) {
       const txnRef = db.collection(`farms/${farmId}/transactions`).doc();
       batch.set(txnRef, {
         id: txnRef.id,
         farmId: farmId,
         ownerUid: userId,
         type: TransactionType.Income,
         category: 'Meat Sale',
         amount: soldAmount,
         date: new Date(date).toISOString(),
         relatedId: rabbitId,
         notes: `Meat sale for rabbit ${rabbitData.tag}`
       });
    }

    await batch.commit();
  },

  async generateNextTag(breedCode: string): Promise<string> {
    if (isDemoMode()) {
        const count = MOCK_STORE.rabbits.length + 1;
        return `SN-${breedCode.substring(0,3).toUpperCase()}-${count.toString().padStart(3,'0')}`;
    }
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/rabbits`).get();
    const count = snapshot.size + 1;
    const seq = count.toString().padStart(3, '0');
    return `SN-${breedCode.toUpperCase().substring(0,3)}-${seq}`;
  },

  // --- Hutches ---

  async getHutches(): Promise<Hutch[]> {
    if (isDemoMode()) return MOCK_STORE.hutches;
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/hutches`)
      .orderBy('number', 'asc')
      .get();
    return snapshot.docs.map(doc => convertDoc(doc) as Hutch);
  },

  async addHutch(data: Omit<Hutch, 'id' | 'farmId' | 'currentOccupancy'>): Promise<void> {
    if (isDemoMode()) {
        const id = 'mock-hutch-' + Math.random();
        MOCK_STORE.hutches.push({ ...data, id, hutchId: `H${data.number}`, currentOccupancy: 0, farmId: 'demo' });
        return;
    }
    const userId = getUserId();
    const farmId = getFarmId();
    const docRef = db.collection(`farms/${farmId}/hutches`).doc();
    const hutchId = `H${data.number.toString().padStart(2, '0')}`;
    
    await docRef.set({
      ...data,
      id: docRef.id,
      hutchId: hutchId,
      currentOccupancy: 0,
      farmId: farmId,
      ownerUid: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  async updateHutch(id: string, updates: Partial<Hutch>): Promise<void> {
    if (isDemoMode()) return;
    const farmId = getFarmId();
    await db.collection(`farms/${farmId}/hutches`).doc(id).update({
      ...updates,
      updatedAt: new Date()
    });
  },

  async deleteHutch(id: string): Promise<void> {
    if (isDemoMode()) {
       MOCK_STORE.hutches = MOCK_STORE.hutches.filter((h: any) => h.id !== id);
       return;
    }
    const farmId = getFarmId();
    const hutchRef = db.collection(`farms/${farmId}/hutches`).doc(id);
    const doc = await hutchRef.get();
    if (doc.exists) {
       const data = doc.data();
       if (data && data.currentOccupancy > 0) throw new Error("Cannot delete hutch that is currently occupied.");
       await hutchRef.delete();
    }
  },

  // --- Breeding & Deliveries ---

  async getCrossings(): Promise<Crossing[]> {
    if (isDemoMode()) return MOCK_STORE.crossings;
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/crossings`)
      .orderBy('dateOfCrossing', 'desc')
      .get();
    return snapshot.docs.map(doc => convertDoc(doc) as Crossing);
  },

  async addCrossing(
    data: Omit<Crossing, 'id' | 'farmId' | 'status' | 'expectedDeliveryDate' | 'expectedPalpationDate'>,
    moveConfig?: { mode: string, targetHutchId: string, doeDbId?: string, sireDbId?: string }
  ): Promise<void> {
    if (isDemoMode()) {
        MOCK_STORE.crossings.push({
            ...data, id: 'mock-cross-'+Math.random(), status: CrossingStatus.Pending, 
            expectedPalpationDate: new Date().toISOString(), expectedDeliveryDate: new Date().toISOString()
        });
        return;
    }

    const userId = getUserId();
    const farmId = getFarmId();
    let settings: Farm;
    try { settings = await this.getFarmSettings(); } catch { settings = { defaultGestationDays: 31, defaultPalpationDays: 14 } as Farm; }
    
    const crossingDate = new Date(data.dateOfCrossing);
    const palpDate = new Date(crossingDate);
    palpDate.setDate(palpDate.getDate() + settings.defaultPalpationDays);
    const deliveryDate = new Date(crossingDate);
    deliveryDate.setDate(deliveryDate.getDate() + settings.defaultGestationDays);

    const docRef = db.collection(`farms/${farmId}/crossings`).doc();
    await docRef.set({
      ...data,
      id: docRef.id,
      status: CrossingStatus.Pending,
      expectedPalpationDate: palpDate,
      expectedDeliveryDate: deliveryDate,
      farmId: farmId,
      ownerUid: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (moveConfig && moveConfig.targetHutchId) {
        if (moveConfig.mode === 'sire_visit_doe' && moveConfig.sireDbId) await this.moveRabbit(moveConfig.sireDbId, moveConfig.targetHutchId, 'Mating', `Visiting Doe ${data.doeId}`);
        else if (moveConfig.mode === 'doe_visit_sire' && moveConfig.doeDbId) await this.moveRabbit(moveConfig.doeDbId, moveConfig.targetHutchId, 'Mating', `Visiting Buck ${data.sireId}`);
        else if (moveConfig.mode === 'neutral') {
            if (moveConfig.doeDbId) await this.moveRabbit(moveConfig.doeDbId, moveConfig.targetHutchId, 'Mating', `Mating with ${data.sireId}`);
            if (moveConfig.sireDbId) await this.moveRabbit(moveConfig.sireDbId, moveConfig.targetHutchId, 'Mating', `Mating with ${data.doeId}`);
        }
    }
  },

  async updateCrossingStatus(id: string, status: CrossingStatus, result?: 'Positive' | 'Negative'): Promise<void> {
    if (isDemoMode()) {
        const c = MOCK_STORE.crossings.find((x: Crossing) => x.id === id);
        if (c) { c.status = status; if(result) c.palpationResult = result; }
        return;
    }
    const farmId = getFarmId();
    const updateData: any = { status, updatedAt: new Date() };
    if (result) updateData.palpationResult = result;
    
    const crossingRef = db.collection(`farms/${farmId}/crossings`).doc(id);
    const crossingSnap = await crossingRef.get();
    const crossing = crossingSnap.data() as Crossing;

    const batch = db.batch();
    batch.update(crossingRef, updateData);

    if (status === CrossingStatus.Pregnant && crossing.doeId) {
       const rabbits = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', crossing.doeId).get();
       if (!rabbits.empty) batch.update(rabbits.docs[0].ref, { status: RabbitStatus.Pregnant });
    }
    if (status === CrossingStatus.Failed && crossing.doeId) {
        const rabbits = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', crossing.doeId).get();
        if (!rabbits.empty) batch.update(rabbits.docs[0].ref, { status: RabbitStatus.Alive });
     }
    await batch.commit();
  },

  async recordDelivery(data: Omit<Delivery, 'id' | 'farmId'>): Promise<void> {
    if (isDemoMode()) {
        MOCK_STORE.deliveries.push(data);
        const c = MOCK_STORE.crossings.find((x: any) => x.id === data.crossingId);
        if (c) { c.status = CrossingStatus.Delivered; c.kitsBorn = data.kitsBorn; c.kitsLive = data.kitsLive; }
        return;
    }
    const userId = getUserId();
    const farmId = getFarmId();
    const batch = db.batch();
    const timestamp = new Date();

    const deliveryRef = db.collection(`farms/${farmId}/deliveries`).doc();
    batch.set(deliveryRef, { ...data, id: deliveryRef.id, farmId, ownerUid: userId, createdAt: timestamp });

    const crossingRef = db.collection(`farms/${farmId}/crossings`).doc(data.crossingId);
    batch.update(crossingRef, { status: CrossingStatus.Delivered, actualDeliveryDate: data.dateOfDelivery, kitsBorn: data.kitsBorn, kitsLive: data.kitsLive, updatedAt: timestamp });

    const doeSnapshot = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', data.doeId).get();
    if (!doeSnapshot.empty) batch.update(doeSnapshot.docs[0].ref, { status: RabbitStatus.Alive });
    
    await batch.commit();
  },

  async updateDelivery(deliveryId: string, crossingId: string, updates: Partial<Delivery>): Promise<void> {
      if (isDemoMode()) return;
      const farmId = getFarmId();
      const batch = db.batch();
      
      const delRef = db.collection(`farms/${farmId}/deliveries`).doc(deliveryId);
      batch.update(delRef, updates);

      if (updates.kitsBorn !== undefined || updates.kitsLive !== undefined || updates.dateOfDelivery !== undefined) {
          const crossRef = db.collection(`farms/${farmId}/crossings`).doc(crossingId);
          const crossUpdate: any = {};
          if (updates.kitsBorn !== undefined) crossUpdate.kitsBorn = updates.kitsBorn;
          if (updates.kitsLive !== undefined) crossUpdate.kitsLive = updates.kitsLive;
          if (updates.dateOfDelivery !== undefined) crossUpdate.actualDeliveryDate = updates.dateOfDelivery;
          batch.update(crossRef, crossUpdate);
      }
      await batch.commit();
  },

  async getDeliveryByCrossingId(crossingId: string): Promise<Delivery | null> {
      if (isDemoMode()) return null;
      const farmId = getFarmId();
      const snap = await db.collection(`farms/${farmId}/deliveries`).where('crossingId', '==', crossingId).limit(1).get();
      if (snap.empty) return null;
      return convertDoc(snap.docs[0]) as Delivery;
  },

  // --- Customers ---

  async getCustomers(): Promise<Customer[]> {
    if (isDemoMode()) return MOCK_STORE.customers;
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/customers`).orderBy('totalSpent', 'desc').get();
    return snapshot.docs.map(doc => convertDoc(doc) as Customer);
  },

  async addCustomer(data: Omit<Customer, 'id' | 'farmId' | 'totalSpent'>): Promise<string> {
    if (isDemoMode()) {
       const id = 'cust-' + Math.random();
       MOCK_STORE.customers.push({ ...data, id, totalSpent: 0, farmId: 'demo' });
       return id;
    }
    const userId = getUserId();
    const farmId = getFarmId();
    const docRef = db.collection(`farms/${farmId}/customers`).doc();
    await docRef.set({
       ...data,
       id: docRef.id,
       totalSpent: 0,
       farmId,
       ownerUid: userId,
       createdAt: new Date()
    });
    return docRef.id;
  },

  // --- Finances (Sales & Transactions) ---

  async getTransactions(): Promise<Transaction[]> {
    if (isDemoMode()) return MOCK_STORE.transactions;
    try {
      const farmId = getFarmId();
      const snapshot = await db.collection(`farms/${farmId}/transactions`).orderBy('date', 'desc').get();
      return snapshot.docs.map(doc => convertDoc(doc) as Transaction);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw error;
    }
  },

  async addTransaction(data: Omit<Transaction, 'id' | 'farmId'>): Promise<void> {
    if (isDemoMode()) {
        MOCK_STORE.transactions.push({ ...data, id: 'mock-txn-'+Math.random(), farmId: 'demo' });
        return;
    }
    const userId = getUserId();
    const farmId = getFarmId();
    const docRef = db.collection(`farms/${farmId}/transactions`).doc();
    await docRef.set({ ...data, id: docRef.id, farmId, ownerUid: userId, createdAt: new Date(), date: new Date(data.date).toISOString() });
  },

  async recordSale(data: Omit<Sale, 'id' | 'farmId' | 'saleId'> & { customer?: Omit<Customer, 'id' | 'farmId' | 'totalSpent'> }): Promise<void> {
    if (isDemoMode()) {
        const saleId = 'S-'+Math.random();
        MOCK_STORE.transactions.push({ type: TransactionType.Income, category: 'Sale', amount: data.amount, date: data.date, notes: 'Mock Sale', farmId: 'demo' });
        // Mock update customer if exists
        if (data.customerId) {
            const cust = MOCK_STORE.customers.find((c: any) => c.id === data.customerId);
            if(cust) cust.totalSpent += data.amount;
        } else if (data.customer) {
            MOCK_STORE.customers.push({ ...data.customer, id: 'new-cust', totalSpent: data.amount });
        }
        return;
    }

    const userId = getUserId();
    const farmId = getFarmId();
    const batch = db.batch();
    const timestamp = new Date();
    
    // 1. Handle Customer
    let customerId = data.customerId;
    if (customerId) {
        // Update Existing
        const custRef = db.collection(`farms/${farmId}/customers`).doc(customerId);
        const custSnap = await custRef.get();
        if (custSnap.exists) {
            const currentTotal = custSnap.data()?.totalSpent || 0;
            batch.update(custRef, { 
                totalSpent: currentTotal + data.amount,
                lastPurchaseDate: new Date(data.date).toISOString()
            });
        }
    } else if (data.customer) {
        // Create New Customer
        const custRef = db.collection(`farms/${farmId}/customers`).doc();
        customerId = custRef.id;
        batch.set(custRef, {
            ...data.customer,
            id: custRef.id,
            totalSpent: data.amount,
            lastPurchaseDate: new Date(data.date).toISOString(),
            farmId,
            ownerUid: userId,
            createdAt: timestamp
        });
    }

    // 2. Create Sale Record
    const saleRef = db.collection(`farms/${farmId}/sales`).doc();
    const saleId = `S-${Math.floor(Date.now() / 1000).toString().substring(4)}`; 
    
    batch.set(saleRef, {
      ...data,
      id: saleRef.id,
      saleId: saleId,
      customerId: customerId || null,
      customer: null, // Don't save the full object in sale doc if we have ID, but keep snapshot if needed. Cleaning up.
      buyerContact: data.buyerContact || null,
      farmId,
      ownerUid: userId,
      createdAt: timestamp,
      date: new Date(data.date).toISOString()
    });

    // 3. Create Transaction
    const txnRef = db.collection(`farms/${farmId}/transactions`).doc();
    batch.set(txnRef, {
      id: txnRef.id,
      farmId,
      ownerUid: userId,
      type: TransactionType.Income,
      category: 'Rabbit Sale',
      amount: data.amount,
      date: new Date(data.date).toISOString(),
      relatedId: saleRef.id,
      notes: `Sale of ${data.rabbitIds.length} rabbit(s) to ${data.buyerName}.`
    });

    // 4. Update Rabbits (Mark Sold, Free Hutch)
    for (const rId of data.rabbitIds) {
      const rabbitRef = db.collection(`farms/${farmId}/rabbits`).doc(rId);
      const rDoc = await rabbitRef.get();
      if (rDoc.exists) {
          const rData = rDoc.data();
          if (rData && rData.currentHutchId) {
             const hutchSnapshot = await db.collection(`farms/${farmId}/hutches`).where('hutchId', '==', rData.currentHutchId).get();
             if (!hutchSnapshot.empty) {
                const hDoc = hutchSnapshot.docs[0];
                batch.update(hDoc.ref, { currentOccupancy: Math.max(0, (hDoc.data().currentOccupancy || 1) - 1) });
             }
             const occSnap = await db.collection(`farms/${farmId}/hutchOccupancy`).where('rabbitId', '==', rId).where('endAt', '==', null).get();
             occSnap.forEach(doc => { batch.update(doc.ref, { endAt: timestamp }); });
          }
      }
      batch.update(rabbitRef, { status: RabbitStatus.Sold, currentHutchId: null, updatedAt: timestamp });
    }

    await batch.commit();
  },

  // --- Medical Records ---
  
  async getMedicalRecords(rabbitId?: string): Promise<MedicalRecord[]> {
    if (isDemoMode()) {
       if (rabbitId) return MOCK_STORE.medical.filter((m: any) => m.rabbitId === rabbitId);
       return MOCK_STORE.medical;
    }
    const farmId = getFarmId();
    let query: any = db.collection(`farms/${farmId}/medical`).orderBy('date', 'desc');
    
    if (rabbitId) {
      const snapshot = await query.get();
      const records = snapshot.docs.map(doc => convertDoc(doc) as MedicalRecord);
      return records.filter(r => r.rabbitId === rabbitId);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => convertDoc(doc) as MedicalRecord);
  },

  async addMedicalRecord(data: Omit<MedicalRecord, 'id' | 'farmId'>): Promise<void> {
     if (isDemoMode()) {
        MOCK_STORE.medical.push({ ...data, id: 'med-'+Math.random(), farmId: 'demo' });
        return;
     }
     const userId = getUserId();
     const farmId = getFarmId();
     const batch = db.batch();
     const timestamp = new Date();

     const medRef = db.collection(`farms/${farmId}/medical`).doc();
     batch.set(medRef, {
       ...data,
       id: medRef.id,
       farmId,
       ownerUid: userId,
       createdAt: timestamp,
       date: new Date(data.date).toISOString(),
       nextDueDate: data.nextDueDate ? new Date(data.nextDueDate).toISOString() : null
     });

     if (data.cost && data.cost > 0) {
        const txnRef = db.collection(`farms/${farmId}/transactions`).doc();
        batch.set(txnRef, {
          id: txnRef.id,
          farmId,
          ownerUid: userId,
          type: TransactionType.Expense,
          category: 'Medication',
          amount: data.cost,
          date: new Date(data.date).toISOString(),
          relatedId: medRef.id,
          notes: `${data.type}: ${data.medicationName} for rabbit ${data.rabbitId}`
        });
     }
     await batch.commit();
  },

  // --- Weight Records ---

  async addWeightRecord(rabbitId: string, weight: number, date: string, ageAtRecord: string, notes?: string): Promise<void> {
      const userId = getUserId();
      const farmId = getFarmId();
      if (isDemoMode()) {
          MOCK_STORE.weights.push({ id: 'wt-' + Math.random(), rabbitId, weight, date, ageAtRecord, unit: 'kg', notes, farmId: 'demo' });
          const r = MOCK_STORE.rabbits.find((rb: any) => rb.tag === rabbitId);
          if (r) r.weight = weight;
          return;
      }
      const batch = db.batch();
      const weightRef = db.collection(`farms/${farmId}/weights`).doc();
      batch.set(weightRef, { id: weightRef.id, rabbitId, weight, unit: 'kg', date: new Date(date).toISOString(), ageAtRecord, notes: notes || '', farmId, ownerUid: userId });
      const rabbitQuery = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', rabbitId).get();
      if (!rabbitQuery.empty) batch.update(rabbitQuery.docs[0].ref, { weight: weight, updatedAt: new Date() });
      await batch.commit();
  },

  // --- Notifications ---

  async getNotifications(limit = 10): Promise<AppNotification[]> {
    if (isDemoMode()) return MOCK_STORE.notifications;
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/notifications`).orderBy('date', 'desc').limit(limit).get();
    return snapshot.docs.map(doc => convertDoc(doc) as AppNotification);
  },

  async markNotificationRead(id: string): Promise<void> {
    if (isDemoMode()) {
        const n = MOCK_STORE.notifications.find((n:any) => n.id === id);
        if (n) n.read = true;
        return;
    }
    const farmId = getFarmId();
    await db.collection(`farms/${farmId}/notifications`).doc(id).update({ read: true });
  },

  async markAllNotificationsRead(): Promise<void> {
    if (isDemoMode()) {
        MOCK_STORE.notifications.forEach((n:any) => n.read = true);
        return;
    }
    const farmId = getFarmId();
    const snapshot = await db.collection(`farms/${farmId}/notifications`).where('read', '==', false).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => { batch.update(doc.ref, { read: true }); });
    await batch.commit();
  },

  async runDailyChecks(): Promise<void> {
    if (isDemoMode()) return;
    const farmId = getFarmId();
    const userId = getUserId();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const addNotify = async (key: string, data: Omit<AppNotification, 'id' | 'farmId'>) => {
        const q = await db.collection(`farms/${farmId}/notifications`).where('title', '==', data.title).where('date', '>=', todayStr).get();
        if (q.empty) {
            await db.collection(`farms/${farmId}/notifications`).add({ ...data, farmId, ownerUid: userId, createdAt: new Date(), read: false });
        }
    };

    const crossings = await this.getCrossings();
    crossings.forEach(c => {
        if (c.status === CrossingStatus.Pregnant) {
            const deliveryDate = new Date(c.expectedDeliveryDate);
            const diffTime = deliveryDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            if (diffDays <= 3 && diffDays >= 0) {
                addNotify(`delivery-${c.id}`, { type: 'Urgent', title: `Delivery Due: ${c.doeId}`, message: `Doe ${c.doeId} is expected to deliver in ${diffDays} day(s).`, date: todayStr, read: false, linkTo: 'breeding' });
            }
        }
        if (c.status === CrossingStatus.Pending) {
             const palpDate = new Date(c.expectedPalpationDate);
             if (palpDate <= now) {
                 addNotify(`palp-${c.id}`, { type: 'Info', title: `Palpation Check: ${c.doeId}`, message: `Check pregnancy for mating with ${c.sireId}.`, date: todayStr, read: false, linkTo: 'breeding' });
             }
        }
    });

    const rabbits = await this.getRabbits();
    rabbits.forEach(r => {
        if (r.dateOfBirth && r.status === RabbitStatus.Alive) {
             const dob = new Date(r.dateOfBirth);
             const ageDays = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
             if (ageDays === 35) {
                 addNotify(`wean-${r.id}`, { type: 'Warning', title: `Weaning Due: ${r.tag}`, message: `Rabbit ${r.tag} is 35 days old. Ready for weaning.`, date: todayStr, read: false, linkTo: 'rabbits' });
             }
        }
    });
  }
};
