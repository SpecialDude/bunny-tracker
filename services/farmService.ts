import { db, auth } from '../firebase';
import { Rabbit, RabbitStatus, Sex, Transaction, TransactionType, Hutch, Crossing, CrossingStatus, Delivery, Sale, Farm, UserProfile, MedicalRecord, HutchOccupancy } from '../types';

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
  medical: [],
  occupancy: []
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
    'date',
    'nextDueDate',
    'startAt',
    'endAt'
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
    
    return {
      farmId: getFarmId(),
      exportedAt: new Date().toISOString(),
      rabbits,
      hutches,
      crossings,
      transactions,
      medical
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
  }> {
    if (isDemoMode()) {
       const rabbit = MOCK_STORE.rabbits.find((r: any) => r.id === rabbitId);
       return { 
           rabbit, 
           offspring: [], 
           medical: MOCK_STORE.medical.filter((m: any) => m.rabbitId === rabbit.tag),
           history: MOCK_STORE.occupancy.filter((o: any) => o.rabbitId === rabbit.id),
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
    // Removed .orderBy() to avoid needing composite indexes in Firestore.
    // Sorting will be done in-memory below.
    const [medicalSnap, historySnap, offspringSnap, littersSnap] = await Promise.all([
        db.collection(`farms/${farmId}/medical`).where('rabbitId', '==', rabbit.tag).get(),
        db.collection(`farms/${farmId}/hutchOccupancy`).where('rabbitId', '==', rabbitId).get(),
        // Finding offspring: where parentage.doeId or sireId matches this rabbit's tag
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
        ).get()
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
        // Client-side sorting (Newest First)
        medical: medicalSnap.docs.map(doc => convertDoc(doc) as MedicalRecord)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        history: historySnap.docs.map(doc => convertDoc(doc) as HutchOccupancy)
            .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
        offspring: offspringSnap.docs.map(doc => convertDoc(doc) as Rabbit),
        litters: littersSnap.docs.map(doc => convertDoc(doc) as Crossing)
            .sort((a, b) => new Date(b.dateOfCrossing).getTime() - new Date(a.dateOfCrossing).getTime()),
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
    // Legacy single/simple add function
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

      // Simple Transaction logic for purchases
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
      
      // Update hutch occupancy AND Create History if assigned
      if (rabbitData.currentHutchId) {
         const hutchSnapshot = await db.collection(`farms/${farmId}/hutches`)
            .where('hutchId', '==', rabbitData.currentHutchId).get();
         
         if (!hutchSnapshot.empty) {
            const hutchDoc = hutchSnapshot.docs[0];
            const hutchRef = hutchDoc.ref;
            
            // Increment
            batch.update(hutchRef, { 
                currentOccupancy: (hutchDoc.data().currentOccupancy || 0) + 1 
            });

            // Create History Record
            const historyRef = db.collection(`farms/${farmId}/hutchOccupancy`).doc();
            batch.set(historyRef, {
                id: historyRef.id,
                rabbitId: newRabbitRef.id, // Link by internal ID
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
    kits: { tag: string, sex: Sex, name: string, hutchId: string }[],
    isPurchase: boolean
  ): Promise<void> {
      const userId = getUserId();
      const farmId = getFarmId();
      const timestamp = new Date();
  
      if (isDemoMode()) {
          kits.forEach(k => {
              const id = 'mock-rabbit-'+Math.random();
              MOCK_STORE.rabbits.push({
                  ...baseData,
                  ...k,
                  id,
                  rabbitId: id,
                  farmId,
                  createdAt: timestamp
              });
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
  
          // Housing Logic
          if (kit.hutchId) {
             const hutchSnapshot = await db.collection(`farms/${farmId}/hutches`)
                .where('hutchId', '==', kit.hutchId).get();
             
             if (!hutchSnapshot.empty) {
                const hutchDoc = hutchSnapshot.docs[0];
                const hutchRef = hutchDoc.ref;
                
                // Increment occupancy
                batch.update(hutchRef, { 
                    currentOccupancy: (hutchDoc.data().currentOccupancy || 0) + 1 
                });
  
                // Create History Record
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
       // Mock move logic for demo
       const r = MOCK_STORE.rabbits.find((r: any) => r.id === rabbitId);
       if (r) r.currentHutchId = targetHutchId;
       return;
    }

    const batch = db.batch();
    const rabbitRef = db.collection(`farms/${farmId}/rabbits`).doc(rabbitId);
    const rabbitDoc = await rabbitRef.get();
    
    if (!rabbitDoc.exists) throw new Error("Rabbit not found");
    const rabbitData = rabbitDoc.data() as Rabbit;

    // 1. Handle Leaving Current Hutch (if any)
    if (rabbitData.currentHutchId) {
        // Find current occupancy record to close it
        const occSnap = await db.collection(`farms/${farmId}/hutchOccupancy`)
            .where('rabbitId', '==', rabbitId)
            .where('hutchId', '==', rabbitData.currentHutchId)
            .where('endAt', '==', null) // Only active ones
            .get();
        
        occSnap.forEach(doc => {
            batch.update(doc.ref, { endAt: timestamp });
        });

        // Decrement old hutch count
        const oldHutchSnap = await db.collection(`farms/${farmId}/hutches`)
            .where('hutchId', '==', rabbitData.currentHutchId).get();
        
        if (!oldHutchSnap.empty) {
            const currentVal = oldHutchSnap.docs[0].data().currentOccupancy || 0;
            batch.update(oldHutchSnap.docs[0].ref, { currentOccupancy: Math.max(0, currentVal - 1) });
        }
    }

    // 2. Handle Entering New Hutch (if target exists)
    if (targetHutchId) {
        const newHutchSnap = await db.collection(`farms/${farmId}/hutches`)
            .where('hutchId', '==', targetHutchId).get();
        
        if (newHutchSnap.empty) throw new Error("Target hutch not found");
        const newHutchDoc = newHutchSnap.docs[0];
        
        // Increment new hutch count
        batch.update(newHutchDoc.ref, { 
            currentOccupancy: (newHutchDoc.data().currentOccupancy || 0) + 1 
        });

        // Create New Occupancy Record
        const newOccRef = db.collection(`farms/${farmId}/hutchOccupancy`).doc();
        batch.set(newOccRef, {
            id: newOccRef.id,
            rabbitId: rabbitId,
            hutchId: targetHutchId,
            hutchLabel: newHutchDoc.data().label,
            startAt: timestamp,
            endAt: null, // Open ended
            purpose: purpose,
            notes: notes || '',
            farmId: farmId,
            ownerUid: userId,
            createdAt: timestamp
        });
    }

    // 3. Update Rabbit Record
    batch.update(rabbitRef, {
        currentHutchId: targetHutchId,
        updatedAt: timestamp
    });

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
           MOCK_STORE.rabbits[idx].notes += ` [${status} on ${date}: ${notes}]`;
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

    // 1. Update Rabbit Status
    batch.update(rabbitRef, {
       status: status,
       currentHutchId: null, // Remove from hutch
       notes: (rabbitData.notes || '') + `\n[${status} on ${date}]: ${notes}`,
       updatedAt: timestamp
    });

    // 2. Decrement Hutch Occupancy & Close History
    if (rabbitData.currentHutchId) {
       const hutchSnapshot = await db.collection(`farms/${farmId}/hutches`)
          .where('hutchId', '==', rabbitData.currentHutchId).get();
       
       if (!hutchSnapshot.empty) {
          const hutchRef = hutchSnapshot.docs[0].ref;
          const currentOcc = hutchSnapshot.docs[0].data().currentOccupancy || 0;
          batch.update(hutchRef, { 
              currentOccupancy: Math.max(0, currentOcc - 1) 
          });
       }

       // Close occupancy history
       const occSnap = await db.collection(`farms/${farmId}/hutchOccupancy`)
            .where('rabbitId', '==', rabbitId)
            .where('endAt', '==', null)
            .get();
        occSnap.forEach(doc => {
            batch.update(doc.ref, { endAt: new Date(date) }); // Set end date to mortality date
        });
    }

    // 3. Create Transaction if Slaughtered & Sold
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
       if (data && data.currentOccupancy > 0) {
          throw new Error("Cannot delete hutch that is currently occupied.");
       }
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
    moveConfig?: { 
      mode: 'sire_visit_doe' | 'doe_visit_sire' | 'neutral', 
      targetHutchId: string,
      doeDbId?: string,
      sireDbId?: string
    }
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
    
    // Calculate dates
    let settings: Farm;
    try {
      settings = await this.getFarmSettings();
    } catch {
      settings = { defaultGestationDays: 31, defaultPalpationDays: 14 } as Farm; 
    }
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

    // Handle Movements if config present
    if (moveConfig && moveConfig.targetHutchId) {
        if (moveConfig.mode === 'sire_visit_doe' && moveConfig.sireDbId) {
            await this.moveRabbit(moveConfig.sireDbId, moveConfig.targetHutchId, 'Mating', `Visiting Doe ${data.doeId}`);
        } else if (moveConfig.mode === 'doe_visit_sire' && moveConfig.doeDbId) {
            await this.moveRabbit(moveConfig.doeDbId, moveConfig.targetHutchId, 'Mating', `Visiting Sire ${data.sireId}`);
        } else if (moveConfig.mode === 'neutral') {
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
       if (!rabbits.empty) {
         batch.update(rabbits.docs[0].ref, { status: RabbitStatus.Pregnant });
       }
    }

    if (status === CrossingStatus.Failed && crossing.doeId) {
        const rabbits = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', crossing.doeId).get();
        if (!rabbits.empty) {
          batch.update(rabbits.docs[0].ref, { status: RabbitStatus.Alive });
        }
     }

    await batch.commit();
  },

  async recordDelivery(data: Omit<Delivery, 'id' | 'farmId'>): Promise<void> {
    if (isDemoMode()) return;
    const userId = getUserId();
    const farmId = getFarmId();
    const batch = db.batch();
    const timestamp = new Date();

    const deliveryRef = db.collection(`farms/${farmId}/deliveries`).doc();
    batch.set(deliveryRef, {
      ...data,
      id: deliveryRef.id,
      farmId: farmId,
      ownerUid: userId,
      createdAt: timestamp
    });

    const crossingRef = db.collection(`farms/${farmId}/crossings`).doc(data.crossingId);
    batch.update(crossingRef, { 
      status: CrossingStatus.Delivered,
      actualDeliveryDate: data.dateOfDelivery,
      updatedAt: timestamp 
    });

    const doeSnapshot = await db.collection(`farms/${farmId}/rabbits`).where('tag', '==', data.doeId).get();
    if (!doeSnapshot.empty) {
       batch.update(doeSnapshot.docs[0].ref, { status: RabbitStatus.Alive });
    }
    
    await batch.commit();
  },

  // --- Finances (Sales & Transactions) ---

  async getTransactions(): Promise<Transaction[]> {
    if (isDemoMode()) return MOCK_STORE.transactions;
    try {
      const farmId = getFarmId();
      const snapshot = await db.collection(`farms/${farmId}/transactions`)
        .orderBy('date', 'desc')
        .get();
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
    
    await docRef.set({
      ...data,
      id: docRef.id,
      farmId: farmId,
      ownerUid: userId,
      createdAt: new Date(),
      date: new Date(data.date).toISOString() 
    });
  },

  async recordSale(data: Omit<Sale, 'id' | 'farmId' | 'saleId'>): Promise<void> {
    if (isDemoMode()) {
        const saleId = 'S-'+Math.random();
        MOCK_STORE.transactions.push({ 
            type: TransactionType.Income, category: 'Sale', amount: data.amount, date: data.date, notes: 'Mock Sale', farmId: 'demo'
        });
        return;
    }

    const userId = getUserId();
    const farmId = getFarmId();
    const batch = db.batch();
    const timestamp = new Date();
    
    const saleRef = db.collection(`farms/${farmId}/sales`).doc();
    const saleId = `S-${Math.floor(Date.now() / 1000).toString().substring(4)}`; 
    
    batch.set(saleRef, {
      ...data,
      id: saleRef.id,
      saleId: saleId,
      farmId: farmId,
      ownerUid: userId,
      createdAt: timestamp,
      date: new Date(data.date).toISOString()
    });

    const txnRef = db.collection(`farms/${farmId}/transactions`).doc();
    batch.set(txnRef, {
      id: txnRef.id,
      farmId: farmId,
      ownerUid: userId,
      type: TransactionType.Income,
      category: 'Rabbit Sale',
      amount: data.amount,
      date: new Date(data.date).toISOString(),
      relatedId: saleRef.id,
      notes: `Sale of ${data.rabbitIds.length} rabbit(s) to ${data.buyerName}. IDs: ${data.rabbitIds.join(', ')}`
    });

    for (const rId of data.rabbitIds) {
      const rabbitRef = db.collection(`farms/${farmId}/rabbits`).doc(rId);
      const rDoc = await rabbitRef.get();
      if (rDoc.exists) {
          // Close occupancy if sold
          const rData = rDoc.data();
          if (rData && rData.currentHutchId) {
             const hutchSnapshot = await db.collection(`farms/${farmId}/hutches`)
                .where('hutchId', '==', rData.currentHutchId).get();
             if (!hutchSnapshot.empty) {
                const hDoc = hutchSnapshot.docs[0];
                batch.update(hDoc.ref, { 
                    currentOccupancy: Math.max(0, (hDoc.data().currentOccupancy || 1) - 1) 
                });
             }
             // Close history
             const occSnap = await db.collection(`farms/${farmId}/hutchOccupancy`)
                .where('rabbitId', '==', rId)
                .where('endAt', '==', null)
                .get();
             occSnap.forEach(doc => {
                 batch.update(doc.ref, { endAt: timestamp });
             });
          }
      }

      batch.update(rabbitRef, {
        status: RabbitStatus.Sold,
        currentHutchId: null,
        updatedAt: timestamp
      });
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
      // In Firestore, standard filtering
      // Note: We'll fetch all and filter in memory if composite index is missing, 
      // or implement where() if we have index. For simplicity with the provided rules:
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
       farmId: farmId,
       ownerUid: userId,
       createdAt: timestamp,
       date: new Date(data.date).toISOString(),
       nextDueDate: data.nextDueDate ? new Date(data.nextDueDate).toISOString() : null
     });

     // Create Expense if cost > 0
     if (data.cost && data.cost > 0) {
        const txnRef = db.collection(`farms/${farmId}/transactions`).doc();
        batch.set(txnRef, {
          id: txnRef.id,
          farmId: farmId,
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
  }
};