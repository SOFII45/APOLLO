import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator,
  Alert, Linking, Platform
} from 'react-native';
import {
  getProducts, getCategories, createProduct, updateProduct, deleteProduct,
  createCategory, deleteCategory, getDailyReport, getMonthlyReport, extractError,
} from '../services/api';
import { C, F, R } from '../constants/theme';

const TABS = [
  { key: 'products',   label: '🥐 Ürünler' },
  { key: 'categories', label: '🏷️ Kategoriler' },
  { key: 'daily',      label: '📊 Günlük' },
  { key: 'monthly',    label: '📅 Aylık' },
];

const fmt = (v) => `₺${Number(v || 0).toFixed(2)}`;
const todayStr = () => new Date().toISOString().split('T')[0];
const BASE_URL = "https://apollo45.pythonanywhere.com/api/"; 

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <View style={[styles.root, { height: Platform.OS === 'web' ? '100vh' : '100%', overflow: 'hidden' }]}>
      <View style={styles.tabBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => setActiveTab(t.key)}>
              <Text style={[styles.tabTxt, activeTab === t.key && styles.tabTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <View style={styles.mainContent}>
        {activeTab === 'products'   && <ProductsTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'daily'      && <DailyTab />}
        {activeTab === 'monthly'    && <MonthlyTab />}
      </View>
    </View>
  );
}

// ── ÜRÜNLER (FİLTRE + CRUD + İPTAL) ──────────────────────────────────────────
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCatId, setNewCatId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [selectedFilterCat, setSelectedFilterCat] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([getProducts(), getCategories()]);
      setProducts(p); setCategories(c);
      if (c.length > 0 && !newCatId) setNewCatId(c[0].id);
    } catch (e) { Alert.alert('Hata', extractError(e)); }
    finally { setLoading(false); }
  }, [newCatId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!newName.trim() || !newPrice || !newCatId) return Alert.alert("Hata", "Eksikleri doldur.");
    setSaving(true);
    try {
      const payload = { name: newName.trim(), price: parseFloat(newPrice).toFixed(2), category: newCatId };
      if (editingId) await updateProduct(editingId, payload);
      else await createProduct(payload);
      setNewName(''); setNewPrice(''); setEditingId(null); load();
    } catch (e) { Alert.alert('Hata', extractError(e)); }
    finally { setSaving(false); }
  };

  const filtered = selectedFilterCat ? products.filter(p => p.category === selectedFilterCat) : products;

  if (loading) return <Loader />;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Ürün Adı" value={newName} onChangeText={setNewName} />
        <TextInput style={styles.input} placeholder="Fiyat" value={newPrice} onChangeText={setNewPrice} keyboardType="numeric" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 5}}>
          {categories.map(c => (
            <TouchableOpacity key={c.id} onPress={() => setNewCatId(c.id)} style={[styles.catBtnSmall, newCatId === c.id && styles.catActive]}>
              <Text style={styles.catTxtSmall}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{flexDirection: 'row', gap: 5}}>
          <TouchableOpacity style={[styles.primaryBtn, {flex: 2}]} onPress={handleSave} disabled={saving}><Text style={styles.primaryBtnTxt}>{editingId ? "GÜNCELLE" : "KAYDET"}</Text></TouchableOpacity>
          {editingId && <TouchableOpacity style={[styles.primaryBtn, {flex: 1, backgroundColor: C.bgLight}]} onPress={() => {setEditingId(null); setNewName(''); setNewPrice('');}}><Text style={{color: '#fff', fontSize: 10}}>İPTAL</Text></TouchableOpacity>}
        </View>
      </View>

      <Text style={styles.label}>Kategori Filtresi:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight: 30, marginBottom: 8}}>
        <TouchableOpacity onPress={() => setSelectedFilterCat(null)} style={[styles.catBtnSmall, !selectedFilterCat && styles.catActive]}><Text style={styles.catTxtSmall}>Hepsi</Text></TouchableOpacity>
        {categories.map(c => (
          <TouchableOpacity key={c.id} onPress={() => setSelectedFilterCat(c.id)} style={[styles.catBtnSmall, selectedFilterCat === c.id && styles.catActive]}><Text style={styles.catTxtSmall}>{c.name}</Text></TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {filtered.map(p => (
          <View key={p.id} style={styles.itemCard}>
            <View style={{flex:1}}><Text style={styles.productName}>{p.name}</Text><Text style={styles.priceAmt}>{fmt(p.price)}</Text></View>
            <TouchableOpacity onPress={() => {setEditingId(p.id); setNewName(p.name); setNewPrice(p.price.toString()); setNewCatId(p.category);}}><Text style={{fontSize: 16}}>✏️</Text></TouchableOpacity>
            <TouchableOpacity style={{marginLeft: 12}} onPress={() => { Alert.alert('Sil', 'Emin misin?', [{text:'Hayır'},{text:'Evet', onPress: async() => {await deleteProduct(p.id); load();}}]) }}><Text style={{fontSize: 16}}>🗑️</Text></TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ── RAPORLAR (MASA 11-14 VE PDF LİNKLERİ EKSİKSİZ) ──────────────────────────
function DailyTab() {
  const [dateStr, setDateStr] = useState(todayStr());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetch = async () => { setLoading(true); try { setReport(await getDailyReport(dateStr)); } catch(e){} finally{setLoading(false);} };
  useEffect(() => { fetch(); }, []);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 8 }}>
        <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={dateStr} onChangeText={setDateStr} />
        <TouchableOpacity style={styles.primaryBtn} onPress={fetch}><Text style={styles.primaryBtnTxt}>GETİR</Text></TouchableOpacity>
      </View>
      {loading ? <Loader /> : report && (
        <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.pdfBtn} onPress={() => Linking.openURL(`${BASE_URL}reports/daily-pdf/?date=${dateStr}`)}><Text style={styles.pdfBtnTxt}>📄 PDF İNDİR</Text></TouchableOpacity>
          <ReportCards report={report} />
        </ScrollView>
      )}
    </View>
  );
}

function ReportCards({ report }) {
  return (
    <View>
      <View style={styles.paymentSection}>
        <View style={[styles.payBox, {borderColor: '#4CAF50'}]}><Text style={styles.payLabel}>💵 NAKİT</Text><Text style={[styles.payVal, {color: '#4CAF50'}]}>{fmt(report.cash_total)}</Text></View>
        <View style={[styles.payBox, {borderColor: '#2196F3'}]}><Text style={styles.payLabel}>💳 KART</Text><Text style={[styles.payVal, {color: '#2196F3'}]}>{fmt(report.card_total)}</Text></View>
      </View>
      <StatCard label="🏠 Salon" value={fmt(report.salon)} />
      <StatCard label="🎁 Misafir (11)" value={fmt(report.misafir)} />
      <StatCard label="🧡 Trendyol (12)" value={fmt(report.trendyol)} />
      <StatCard label="💜 Getir (13)" value={fmt(report.getir)} />
      <StatCard label="🛵 Kurye (14)" value={fmt(report.kurye)} />
      <StatCard label="TOPLAM" value={fmt(report.total_revenue)} highlight />
    </View>
  );
}

// ── DİĞERLERİ (KATEGORİ, MONTHLY, STAT) ──────────────────────────────────────
function CategoriesTab() {
  const [cats, setCats] = useState([]); const [n, setN] = useState('');
  const load = async () => setCats(await getCategories());
  useEffect(() => { load(); }, []);
  return (
    <View style={{flex:1}}>
      <View style={styles.card}><TextInput style={styles.input} value={n} onChangeText={setN}/><TouchableOpacity style={styles.primaryBtn} onPress={async()=>{await createCategory({name:n, order:1}); setN(''); load();}}><Text style={styles.primaryBtnTxt}>EKLE</Text></TouchableOpacity></View>
      <ScrollView style={{flex:1}}>{cats.map(c=>(<View key={c.id} style={styles.itemCard}><Text style={{color:'#fff', flex:1}}>{c.name}</Text><TouchableOpacity onPress={async()=>{await deleteCategory(c.id); load();}}><Text>🗑️</Text></TouchableOpacity></View>))}</ScrollView>
    </View>
  );
}

function MonthlyTab() {
  const [y, setY] = useState("2026"); const [m, setM] = useState("2");
  const [report, setReport] = useState(null);
  const fetch = async () => setReport(await getMonthlyReport(y, m));
  useEffect(() => { fetch(); }, []);
  return (
    <View style={{ flex: 1 }}>
      <View style={{flexDirection:'row', gap: 5, marginBottom: 8}}><TextInput style={[styles.input, {flex:1}]} value={y} onChangeText={setY}/><TextInput style={[styles.input, {flex:1}]} value={m} onChangeText={setM}/><TouchableOpacity style={styles.primaryBtn} onPress={fetch}><Text style={styles.primaryBtnTxt}>OK</Text></TouchableOpacity></View>
      {report && <ScrollView><ReportCards report={report} /></ScrollView>}
    </View>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <View style={[styles.statCard, highlight && { backgroundColor: C.amber }]}>
      <Text style={[styles.statLabel, highlight && { color: '#000' }]}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: '#000' }]}>{value}</Text>
    </View>
  );
}

function Loader() { return <ActivityIndicator color={C.amber} style={{ marginTop: 10 }} />; }

// ── STYLE (KESİN ÇÖZÜM) ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgDark },
  tabBarWrapper: { backgroundColor: C.bgMid, borderBottomWidth: 1, borderColor: C.border },
  tabBarContent: { padding: 5, gap: 5 },
  tab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, backgroundColor: C.bgLight },
  tabActive: { backgroundColor: C.amber },
  tabTxt: { fontSize: 10, color: C.txtSecond },
  tabTxtActive: { color: '#000', fontWeight: 'bold' },
  mainContent: { flex: 1, padding: 8, maxWidth: 600, alignSelf: 'center', width: '100%' },
  card: { backgroundColor: C.bgMid, padding: 8, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  input: { backgroundColor: C.bgLight, color: '#fff', padding: 6, borderRadius: 5, fontSize: 12, marginBottom: 5, borderWidth: 1, borderColor: C.border },
  label: { color: C.txtSecond, fontSize: 9, marginBottom: 4, fontWeight: 'bold' },
  primaryBtn: { backgroundColor: C.amber, padding: 8, borderRadius: 5, alignItems: 'center' },
  primaryBtnTxt: { color: '#000', fontWeight: 'bold', fontSize: 11 },
  itemCard: { flexDirection: 'row', backgroundColor: C.bgMid, padding: 8, borderRadius: 6, marginBottom: 4, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  productName: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  priceAmt: { color: C.amber, fontSize: 11, fontWeight: 'bold' },
  statCard: { backgroundColor: C.bgMid, padding: 8, borderRadius: 6, marginBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statLabel: { fontSize: 10, color: C.txtSecond, fontWeight: 'bold' },
  statValue: { fontSize: 13, fontWeight: 'bold', color: '#fff' },
  paymentSection: { flexDirection: 'row', gap: 5, marginBottom: 6 },
  payBox: { flex: 1, padding: 8, borderRadius: 6, borderWidth: 2, alignItems: 'center', backgroundColor: C.bgMid },
  payLabel: { fontSize: 9, fontWeight: 'bold' },
  payVal: { fontSize: 12, fontWeight: 'bold' },
  pdfBtn: { backgroundColor: '#d32f2f', padding: 8, borderRadius: 6, marginBottom: 8, alignItems: 'center' },
  pdfBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  catBtnSmall: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.bgLight, marginRight: 5, borderRadius: 5 },
  catActive: { backgroundColor: C.amber },
  catTxtSmall: { fontSize: 10, color: '#fff', fontWeight: 'bold' }
});
