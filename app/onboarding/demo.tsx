import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../providers/ThemeProvider';
import { typography } from '../../styles/typography';
import { FontAwesome, Feather, Ionicons } from '@expo/vector-icons';

// --- SHARED CONSTANTS ---
const TAX_BRACKETS = [
  { label: '25.5%', value: '25.5' },
  { label: '14%', value: '14' },
  { label: '10%', value: '10' },
  { label: '0%', value: '0' },
];

// --- SUB-COMPONENT: IDENTIFIER SELECTOR (Step 1) ---
const IdentifierSelector = ({ value, onValueChange, colors }: any) => (
  <View style={{ flexDirection: 'row', marginTop: 8 }}>
    <Pressable 
      style={[
        { flex: 1, padding: 6, borderRadius: 6, borderWidth: 1, alignItems: 'center', marginRight: 8 },
        { borderColor: colors.border }, 
        value === 'alphabetical' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
      ]} 
      onPress={() => onValueChange('alphabetical')}
    >
      <Text style={[typography.caption, { color: value === 'alphabetical' ? colors.primary : colors.subtext }]}>A, B, C...</Text>
    </Pressable>
    <Pressable 
      style={[
        { flex: 1, padding: 6, borderRadius: 6, borderWidth: 1, alignItems: 'center' },
        { borderColor: colors.border }, 
        value === 'numerical' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
      ]} 
      onPress={() => onValueChange('numerical')}
    >
      <Text style={[typography.caption, { color: value === 'numerical' ? colors.primary : colors.subtext }]}>1, 2, 3...</Text>
    </Pressable>
  </View>
);

// --- STEP 1: INVENTORY WIZARD DEMO ---
const QuickInventoryDemo = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ warehouseName: '', warehouseIcon: 'archive', storageName: '', totalLocations: 0 });
  const [dims, setDims] = useState({ s: '', r: '', c: '' });
  const [types, setTypes] = useState({ s: 'alphabetical', r: 'numerical', c: 'numerical' });

  const warehouseIcons = ['archive', 'home', 'truck', 'database'];

  const handleWarehouseCreate = () => {
    if (!data.warehouseName.trim()) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep(1); }, 500);
  };

  const handleStorageCreate = () => {
    if (!data.storageName.trim()) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep(2); }, 500);
  };

  const handleLocationGenerate = () => {
    const s = parseInt(dims.s) || 0;
    const r = parseInt(dims.r) || 1;
    const c = parseInt(dims.c) || 1;
    const total = s * r * c;
    if (total === 0) return;
    setLoading(true);
    setTimeout(() => { setData(prev => ({ ...prev, totalLocations: total })); setLoading(false); setStep(3); }, 800);
  };

  if (step === 3) {
    return (
      <View style={[styles.miniCard, { backgroundColor: colors.background, borderColor: colors.success, flexDirection: 'column', alignItems: 'center', padding: 24 }]}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.success + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
          <FontAwesome name="check" size={30} color={colors.success} />
        </View>
        <Text style={[typography.h3, { color: colors.text, textAlign: 'center', marginBottom: 8 }]}>{t('demo.setupComplete', 'Setup Complete!')}</Text>
        <Text style={[typography.body, { color: colors.subtext, textAlign: 'center', marginBottom: 20 }]}>
          {t('demo.summary', 'Created {{ware}} with {{loc}} locations.', { ware: data.warehouseName, loc: data.totalLocations })}
        </Text>
        <Pressable onPress={() => { setStep(0); setData({ ...data, warehouseName: '', storageName: '' }); }} style={{ padding: 10 }}>
            <Text style={[typography.button, { color: colors.primary }]}>{t('demo.restart', 'Restart Demo')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.miniCard, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
      <View style={{ flexDirection: 'row', height: 4, marginBottom: 16, gap: 4 }}>
        {[0, 1, 2].map(i => (<View key={i} style={{ flex: 1, borderRadius: 2, backgroundColor: i <= step ? colors.primary : colors.border }} />))}
      </View>
      {step === 0 && (
        <>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 12 }]}>{t('warehouse.createHeader', 'Create Warehouse')}</Text>
          <TextInput style={[styles.demoInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} placeholder={t('warehouse.name', 'Warehouse Name')} placeholderTextColor={colors.subtext} value={data.warehouseName} onChangeText={(t) => setData({ ...data, warehouseName: t })} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {warehouseIcons.map(icon => (
              <Pressable key={icon} onPress={() => setData({ ...data, warehouseIcon: icon })} style={[styles.iconBtn, { borderColor: data.warehouseIcon === icon ? colors.primary : colors.border, backgroundColor: data.warehouseIcon === icon ? colors.primary + '20' : 'transparent' }]}>
                <Feather name={icon as any} size={18} color={data.warehouseIcon === icon ? colors.primary : colors.text} />
              </Pressable>
            ))}
          </View>
          <Pressable style={[styles.demoBtn, { backgroundColor: colors.primary }]} onPress={handleWarehouseCreate}>
             {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.demoBtnText}>{t('general.cont', 'Next')}</Text>}
          </Pressable>
        </>
      )}
      {step === 1 && (
        <>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 4 }]}>{t('storage.createHeader', 'Create Storage')}</Text>
          <Text style={[typography.caption, { color: colors.subtext, marginBottom: 12 }]}>{t('demo.inside', 'Inside')}: {data.warehouseName}</Text>
          <TextInput style={[styles.demoInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} placeholder={t('storage.namePlaceholder', 'Storage Name')} placeholderTextColor={colors.subtext} value={data.storageName} onChangeText={(t) => setData({ ...data, storageName: t })} />
          <Pressable style={[styles.demoBtn, { backgroundColor: colors.primary }]} onPress={handleStorageCreate}>
             {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.demoBtnText}>{t('general.next', 'Next')}</Text>}
          </Pressable>
        </>
      )}
      {step === 2 && (
        <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
          <Text style={[typography.h3, { color: colors.text, marginBottom: 12 }]}>{t('location.generatorHeader', 'Generate Grid')}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.subtext }]}>{t('location.numShelves', 'Shelves')}</Text>
              <TextInput style={[styles.demoInput, { marginBottom: 0, backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} keyboardType="numeric" value={dims.s} onChangeText={t => setDims({...dims, s: t})} />
            </View>
            <View style={{ flex: 1.5 }}><Text style={[typography.caption, { color: colors.subtext }]}>{t('general.type', 'Type')}</Text><IdentifierSelector value={types.s} onValueChange={(v:any) => setTypes({...types, s: v})} colors={colors} /></View>
          </View>
          <Pressable style={[styles.demoBtn, { backgroundColor: colors.primary }]} onPress={handleLocationGenerate}>
             {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.demoBtnText}>{t('location.generatorButton', 'Generate')}</Text>}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
};

// --- STEP 2: ADD ITEM DEMO ---
const AddItemDemo = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('50');
  const [showFinancials, setShowFinancials] = useState(false);
  const [usageType, setUsageType] = useState<'production' | 'resale'>('production');
  const [price, setPrice] = useState('');
  const [tax, setTax] = useState('25.5');

  const increment = () => setQuantity(prev => (parseInt(prev || '0', 10) + 1).toString());
  const decrement = () => setQuantity(prev => { const val = parseInt(prev || '0', 10); return val > 0 ? (val - 1).toString() : '0'; });
  const handleSave = () => { if(!name.trim()) return; setSaving(true); setTimeout(() => { setSaving(false); setSubmitted(true); }, 1200); };

  if (submitted) {
    return (
      <View style={[styles.miniCard, { backgroundColor: colors.background, borderColor: colors.success, alignItems: 'center', flexDirection: 'column', padding: 30 }]}>
         <FontAwesome name="cube" size={50} color={colors.primary} style={{ marginBottom: 16 }} />
         <Text style={[typography.h3, { color: colors.text, marginBottom: 8 }]}>{t('general.success', 'Item Added!')}</Text>
         <Text style={[typography.body, { color: colors.subtext, textAlign: 'center' }]}>{name} ({quantity}x) {t('general.addedToInventory', 'added to inventory.')}</Text>
         <Pressable onPress={() => { setSubmitted(false); setName(''); }} style={{ marginTop: 20 }}><FontAwesome name="refresh" size={20} color={colors.subtext} /></Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.miniCard, { backgroundColor: colors.background, borderColor: colors.border, padding: 0, overflow: 'hidden', flexDirection: 'column', alignItems: 'stretch' }]}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={[typography.h3, { color: colors.text }]}>{t('item.newItem', 'New Item')}</Text></View>
      <ScrollView nestedScrollEnabled style={{ maxHeight: 240, padding: 16 }}>
         <Text style={[typography.caption, { color: colors.subtext, marginBottom: 4 }]}>{t('item.itemName*', 'Name')}</Text>
         <TextInput style={[styles.demoInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={name} onChangeText={setName} placeholder="Widget B" placeholderTextColor={colors.subtext} />
         <Text style={[typography.caption, { color: colors.subtext, marginBottom: 4 }]}>{t('item.quantity*', 'Quantity')}</Text>
         <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 }}>
            <Pressable onPress={decrement} style={[styles.iconBtn, { borderColor: colors.border }]}><FontAwesome name="minus" size={12} color={colors.text} /></Pressable>
            <Text style={[typography.h3, { color: colors.text, flex: 1, textAlign: 'center' }]}>{quantity}</Text>
            <Pressable onPress={increment} style={[styles.iconBtn, { borderColor: colors.border }]}><FontAwesome name="plus" size={12} color={colors.text} /></Pressable>
         </View>
         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
             <Text style={[typography.body, { color: colors.text, fontSize: 14 }]}>{t('item.financialDetails', 'Financial Details')}</Text>
             <Switch value={showFinancials} onValueChange={setShowFinancials} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
         </View>
         {showFinancials && (
           <View style={{ marginBottom: 16, padding: 12, backgroundColor: colors.card, borderRadius: 8 }}>
              <View style={{ flexDirection: 'row', borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 12, overflow: 'hidden' }}>
                 <Pressable onPress={() => setUsageType('production')} style={{ flex: 1, padding: 8, backgroundColor: usageType === 'production' ? colors.primary : 'transparent', alignItems: 'center' }}><Text style={[typography.caption, { color: usageType === 'production' ? '#fff' : colors.text }]}>{t('item.production', 'Production')}</Text></Pressable>
                 <Pressable onPress={() => setUsageType('resale')} style={{ flex: 1, padding: 8, backgroundColor: usageType === 'resale' ? colors.primary : 'transparent', alignItems: 'center' }}><Text style={[typography.caption, { color: usageType === 'resale' ? '#fff' : colors.text }]}>{t('item.resale', 'Resale')}</Text></Pressable>
              </View>
              <Text style={[typography.caption, { color: colors.subtext }]}>{t('item.price', 'Price')}</Text>
              <TextInput style={[styles.demoInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, marginBottom: 8 }]} placeholder="0.00" keyboardType="numeric" value={price} onChangeText={setPrice} />
           </View>
         )}
         <Pressable style={[styles.demoBtn, { backgroundColor: colors.primary, marginTop: 8, marginBottom: 20 }]} onPress={handleSave}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.demoBtnText}>{t('general.save', 'Save Item')}</Text>}
         </Pressable>
      </ScrollView>
    </View>
  );
};

// --- STEP 3: EXPORT DEMO (New!) ---
const ExportDemo = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  const [isExporting, setIsExporting] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [taxRate, setTaxRate] = useState(0.24);

  // Fake Data for the Report
  const dummyInventory = [
    { name: 'Widget A', qty: 50, cost: 10.00 },
    { name: 'Heavy Box', qty: 5, cost: 100.00 },
    { name: 'Scanned Item', qty: 20, cost: 45.50 },
  ];

  const handleExport = () => {
    setIsExporting(true);
    // Simulate generation time
    setTimeout(() => {
      setIsExporting(false);
      setShowReport(true);
    }, 1500);
  };

  const toggleTax = () => setTaxRate(prev => prev === 0.24 ? 0.255 : 0.24);

  // Report Calculation Logic (Simulated from SettingsScreen)
  const totalNet = dummyInventory.reduce((sum, item) => sum + (item.qty * item.cost), 0);
  const totalGross = totalNet * (1 + taxRate);

  if (showReport) {
    // PREVIEW MODE (Simulates PDF View)
    return (
      <View style={[styles.miniCard, { backgroundColor: '#fff', borderColor: colors.border, padding: 0, overflow: 'hidden', height: 280 }]}>
         {/* Fake PDF Header */}
         <View style={{ padding: 16, backgroundColor: '#f2f2f2', borderBottomWidth: 1, borderColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[typography.caption, { fontWeight: 'bold', color: '#333' }]}>{t('export.inventoryReport', 'INVENTORY REPORT')}</Text>
            <Pressable onPress={() => setShowReport(false)}>
              <FontAwesome name="close" size={16} color="#666" />
            </Pressable>
         </View>
         
         <ScrollView style={{ flex: 1, padding: 16 }}>
            {/* Table Header */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderColor: '#000', paddingBottom: 4, marginBottom: 8 }}>
              <Text style={{ flex: 2, fontSize: 10, fontWeight: 'bold' }}>{t('export.colName', 'ITEM')}</Text>
              <Text style={{ flex: 1, fontSize: 10, fontWeight: 'bold', textAlign: 'right' }}>{t('export.colQty', 'QTY')}</Text>
              <Text style={{ flex: 1, fontSize: 10, fontWeight: 'bold', textAlign: 'right' }}>{t('export.colTotalNet', 'NET')}</Text>
            </View>

            {/* Rows */}
            {dummyInventory.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', paddingVertical: 6 }}>
                 <Text style={{ flex: 2, fontSize: 10 }}>{item.name}</Text>
                 <Text style={{ flex: 1, fontSize: 10, textAlign: 'right' }}>{item.qty}</Text>
                 <Text style={{ flex: 1, fontSize: 10, textAlign: 'right' }}>{(item.qty * item.cost).toFixed(2)}</Text>
              </View>
            ))}

            {/* Totals */}
            <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
               <Text style={{ fontSize: 10, color: '#666' }}>{t('export.costOfStock', 'Total Net')}: <Text style={{ fontWeight: 'bold', color: '#000' }}>{totalNet.toFixed(2)}</Text></Text>
               <Text style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{t('settings.taxRate', 'Tax')} ({(taxRate * 100).toFixed(1)}%): <Text style={{ fontWeight: 'bold', color: '#000' }}>{(totalGross - totalNet).toFixed(2)}</Text></Text>
               <View style={{ height: 1, width: 80, backgroundColor: '#000', marginVertical: 4 }} />
               <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{t('export.withTax', 'Total Gross')}: {totalGross.toFixed(2)}</Text>
            </View>
         </ScrollView>
      </View>
    );
  }

  // SETTINGS MODE
  return (
    <View style={[styles.miniCard, { backgroundColor: colors.background, borderColor: colors.border, padding: 0, overflow: 'hidden', flexDirection: 'column', alignItems: 'stretch' }]}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
         <Text style={[typography.h3, { color: colors.text }]}>{t('settings.data', 'Data & Reports')}</Text>
      </View>

      <View style={{ padding: 16 }}>
         {/* Tax Rate Selector */}
         <Pressable 
            onPress={toggleTax}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
         >
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
                <View style={{ marginLeft: 12 }}>
                   <Text style={[typography.body, { color: colors.text, fontWeight: 'bold' }]}>{t('settings.taxRate', 'Tax Rate')}</Text>
                   <Text style={[typography.caption, { color: colors.subtext }]}>{t('settings.taxFallback', '(Global Default)')}</Text>
                </View>
             </View>
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[typography.body, { color: colors.primary, marginRight: 8 }]}>{(taxRate * 100).toFixed(1)}%</Text>
                <FontAwesome name="chevron-down" size={12} color={colors.subtext} />
             </View>
         </Pressable>

         {/* Export Button */}
         <Pressable 
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginTop: 12, opacity: isExporting ? 0.6 : 1 }}
            onPress={handleExport}
            disabled={isExporting}
         >
            {isExporting ? <ActivityIndicator color={colors.primary} /> : <FontAwesome name="download" size={18} color={colors.primary} />}
            <Text style={[typography.button, { color: colors.primary, marginLeft: 10, fontSize: 16 }]}>
               {isExporting ? t('settings.expo', 'Generating...') : t('settings.expoAll', 'Export Inventory Report')}
            </Text>
         </Pressable>
         
         <Text style={[typography.caption, { color: colors.subtext, textAlign: 'center', marginTop: 16 }]}>
            {t('settings.exportFormatMessage', 'Generates PDF or CSV with full financial breakdown.')}
         </Text>
      </View>
    </View>
  );
};


// --- MAIN SCREEN EXPORT ---

const demoSteps = [
  {
    id: 1,
    titleKey: 'onboarding.demoStep1Title',
    descKey: 'onboarding.demoStep1Desc',
  },
  {
    id: 2,
    titleKey: 'onboarding.demoStep2Title',
    descKey: 'onboarding.demoStep2Desc',
  },
  {
    id: 3,
    titleKey: 'onboarding.demoStep3Title', // "Reports & Data"
    descKey: 'onboarding.demoStep3Desc',  // "Visualize value and export..."
  },
];

export default function DemoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push('/onboarding/paywall');
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/paywall');
  };

  const step = demoSteps[currentStep];

  const renderDemoVisual = (id: number) => {
    switch(id) {
      case 1: return <QuickInventoryDemo />;
      case 2: return <AddItemDemo />;
      case 3: return <ExportDemo />; // Replaced Transfer with Export
      default: return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={[typography.body, { color: colors.subtext }]}>
            {t('onboarding.skipDemo', 'Skip')}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stepIndicators}>
          {demoSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                {
                  backgroundColor: index <= currentStep ? colors.primary : colors.border,
                  width: index === currentStep ? 32 : 8,
                }
              ]}
            />
          ))}
        </View>

        <View style={styles.demoContent}>
          <Text style={[typography.h1, styles.stepTitle, { color: colors.text }]}>
            {t(step.titleKey, `Step ${step.id}`)}
          </Text>

          <Text style={[typography.body, styles.stepDesc, { color: colors.subtext }]}>
            {t(step.descKey, 'Description')}
          </Text>

          {/* DYNAMIC INTERACTIVE VISUAL CONTAINER */}
          <View style={[styles.demoVisual, { backgroundColor: colors.card, borderColor: colors.border }]}>
             {renderDemoVisual(step.id)}
          </View>

          <View style={[styles.tipBox, { backgroundColor: colors.primaryMuted }]}>
            <FontAwesome name="lightbulb-o" size={20} color={colors.primary} />
            <Text style={[typography.caption, styles.tipText, { color: colors.text }]}>
              {t(`onboarding.demoTip${step.id}`, 'Helpful tip about this feature')}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.navigation}>
        {currentStep > 0 && (
          <Pressable
            style={[styles.navButton, styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <FontAwesome name="arrow-left" size={16} color={colors.text} />
          </Pressable>
        )}

        <Pressable
          style={[styles.navButton, styles.nextButton, { backgroundColor: colors.primary }]}
          onPress={handleNext}
        >
          <Text style={[typography.button, { color: colors.primaryText }]}>
            {currentStep === demoSteps.length - 1
              ? t('onboarding.startTrial', 'Start Free Trial')
              : t('general.next', 'Next')
            }
          </Text>
          <FontAwesome name="arrow-right" size={16} color={colors.primaryText} style={{ marginLeft: 8 }} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingHorizontal: 24,
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
  skipButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  demoContent: {
    alignItems: 'center',
  },
  stepTitle: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 24,
    fontWeight: 'bold',
  },
  stepDesc: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  demoVisual: {
    width: '100%',
    minHeight: 280, 
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  
  // --- MINI COMPONENT STYLES ---
  miniCard: {
    width: '100%',
    padding: 16, 
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  demoInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    fontSize: 14,
  },
  demoBtn: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  demoBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    width: '100%',
  },
  tipText: {
    flex: 1,
    lineHeight: 16,
    fontSize: 13,
  },
  navigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
  },
  backButton: {
    borderWidth: 1,
    width: 52,
  },
  nextButton: {
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});