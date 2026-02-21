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
    <View style={[styles.root, Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }]}>
      <View style={styles.tabBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => setActiveTab(t.key)}>
              <Text style={[styles.tabTxt, activeTab === t.key && styles.tabTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.mainScrollContent} keyboardShouldPersistTaps="handled">
        {activeTab === 'products'   && <ProductsTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'daily'      && <DailyTab />}
        {activeTab === 'monthly'    && <MonthlyTab />}
      </ScrollView>
    </View>
  );
}

// ── PRODUCTS TAB (Tüm Orijinal Fonksiyonlar) ───────────────────────────────────
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCatId, setNewCatId] = useState(null);
  const [editingId, setEditingId] = useState(null);

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
    if (!newName.trim() || !newPrice || !newCatId) {
      Alert.alert("Hata", "Lütfen isim, fiyat doldurun ve kategori seçin.");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: newName.trim(), price: parseFloat(newPrice).toFixed(2), category: newCatId };
      if (editingId) {
        await updateProduct(editingId, payload);
        setProducts(prev => prev.map(p => p.id === editingId ? {...p, ...payload} : p));
        Alert.alert("Başarılı", "Ürün güncellendi.");
      } else {
        const newProd = await createProduct(payload);
        setProducts(prev => [...prev, newProd]);
        Alert.alert("Başarılı", "Ürün eklendi.");
      }
      setNewName(''); setNewPrice(''); setEditingId(null);
    } catch (e) { Alert.alert('Hata', extractError(e)); }
    finally { setSaving(false); }
  };

  const startEdit = (p) => {
    setEditingId(p.id); setNewName(p.name);
    setNewPrice(p.price.toString()); setNewCatId(p.category);
  };

  const handleDelete = (id) => {
    Alert.alert('Ürünü Sil', 'Bu ürünü tamamen silmek istediğine emin misin?', [
      { text: 'Vazgeç' },
      { text: 'SİL', style: 'destructive', onPress: async () => {
          try {
            await deleteProduct(id);
            setProducts(prev => prev.filter(p => p.id !== id));
            Alert.alert("Bilgi", "Ürün silindi.");
          } catch (e) { Alert.alert('Hata', "Silinemedi."); }
      }}
    ]);
  };

  if (loading) return <Loader />;

  return (
    <View>
      <View style={[styles.card, { padding: 12 }]}>
        <Text style={[styles.formTitle, { fontSize: 14 }]}>{editingId ? "🎁 Ürünü Düzenle" : "🆕 Yeni Ürün Ekle"}</Text>
        <TextInput style={[styles.input, { padding: 8 }]} placeholder="Ürün Adı" value={newName} onChangeText={setNewName} placeholderTextColor={C.txtDim} />
        <TextInput style={[styles.input, { padding: 8 }]} placeholder="Fiyat (Örn: 120)" value={newPrice} onChangeText={setNewPrice} keyboardType="numeric" placeholderTextColor={C.txtDim} />
        <Text style={styles.label}>Kategori Seç:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}}>
          {categories.map(c => (
            <TouchableOpacity key={c.id} onPress={() => setNewCatId(c.id)} style={[styles.catSelectBtn, { paddingVertical: 6 }, newCatId === c.id && styles.catSelectBtnActive]}>
              <Text style={[styles.catSelectTxt, { fontSize: 12 }, newCatId === c.id && styles.catSelectTxtActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{flexDirection: 'row', gap: 10}}>
            <TouchableOpacity style={[styles.primaryBtn, {flex: 2, padding: 10}]} onPress={handleSave} disabled={saving}><Text style={styles.primaryBtnTxt}>{editingId ? "GÜNCELLE" : "KAYDET"}</Text></TouchableOpacity>
            {editingId && (
                <TouchableOpacity style={[styles.primaryBtn, {flex: 1, padding: 10, backgroundColor: C.bgLight}]} onPress={() => {setEditingId(null); setNewName(''); setNewPrice('');}}>
                    <Text style={[styles.primaryBtnTxt, {color: C.txtPrimary}]}>İPTAL</Text>
                </TouchableOpacity>
            )}
        </View>
      </View>
      {products.map(p => (
        <View key={p.id} style={[styles.itemCard, { padding: 10 }]}>
          <View style={{ flex: 1 }}><Text style={[styles.productName, { fontSize: 14 }]}>{p.name}</Text><Text style={[styles.priceAmt, { fontSize: 14 }]}>{fmt(p.price)}</Text></View>
          <View style={{flexDirection: 'row', gap: 15}}><TouchableOpacity onPress={() => startEdit(p)}><Text style={{fontSize: 20}}>✏️</Text></TouchableOpacity><TouchableOpacity onPress={() => handleDelete(p.id)}><Text style={{fontSize: 20}}>🗑️</Text></TouchableOpacity></View>
        </View>
      ))}
    </View>
  );
}

// ── CATEGORIES TAB (Tam Özellikler) ───────────────────────────────────────────
function CategoriesTab() {
  const [cats, setCats] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => { try { const data = await getCategories(); setCats(data); } catch (e) { Alert.alert('Hata', extractError(e)); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const handleAdd = async () => {
    if (!newName.trim()) return;
    try { await createCategory({ name: newName.trim(), order: cats.length + 1 }); setNewName(''); load(); } catch (e) { Alert.alert('Hata', extractError(e)); }
  };
  const handleDelete = (id) => {
    Alert.alert('Kategoriyi Sil', 'Bu kategoriyi tamamen silmek istiyor musun?', [
      { text: 'Vazgeç' },
      { text: 'SİL', style: 'destructive', onPress: async () => { try { await deleteCategory(id); load(); } catch (e) { Alert.alert('Hata', "Silinemedi. Kategoriye bağlı ürünler olabilir."); } }}
    ]);
  };
  if (loading) return <Loader />;
  return (
    <View>
      <View style={[styles.card, { padding: 12 }]}>
        <TextInput style={[styles.input, { padding: 8 }]} placeholder="Yeni Kategori Adı" value={newName} onChangeText={setNewName} placeholderTextColor={C.txtDim} />
        <TouchableOpacity style={[styles.primaryBtn, { padding: 10 }]} onPress={handleAdd}><Text style={styles.primaryBtnTxt}>Kategori Ekle</Text></TouchableOpacity>
      </View>
      {cats.map(c => (
        <View key={c.id} style={[styles.itemCard, { padding: 10 }]}>
          <Text style={[styles.productName, {flex: 1, fontSize: 14}]}>{c.name}</Text>
          <TouchableOpacity onPress={() => handleDelete(c.id)}><Text style={{fontSize: 20}}>🗑️</Text></TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

// ── REPORTS (TAM ÖZELLİKLER: PDF, TRENDYOL, GETİR, KURYE...) ─────────────────────
function DailyTab() {
  const [dateStr, setDateStr] = useState(todayStr());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetch = async () => { setLoading(true); try { setReport(await getDailyReport(dateStr)); } catch (e) { Alert.alert('Hata', extractError(e)); } finally { setLoading(false); } };
  const downloadPdf = () => { Linking.openURL(`${BASE_URL}reports/daily-pdf/?date=${dateStr}`).catch(() => Alert.alert('Hata', 'PDF açılamadı.')); };
  useEffect(() => { fetch(); }, []);
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 15 }}>
        <TextInput style={[styles.input, { flex: 1, marginBottom: 0, padding: 8 }]} value={dateStr} onChangeText={setDateStr} />
        <TouchableOpacity style={[styles.primaryBtn, { padding: 10 }]} onPress={fetch}><Text style={styles.primaryBtnTxt}>Getir</Text></TouchableOpacity>
      </View>
      {loading ? <Loader /> : report && (
        <View>
          <TouchableOpacity style={[styles.pdfBtn, { padding: 10 }]} onPress={downloadPdf}><Text style={[styles.pdfBtnTxt, { fontSize: 13 }]}>📄 Günlük PDF İndir</Text></TouchableOpacity>
          <ReportCards report={report} />
        </View>
      )}
    </View>
  );
}

function MonthlyTab() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetch = async () => { setLoading(true); try { setReport(await getMonthlyReport(year, month)); } catch (e) { Alert.alert('Hata', extractError(e)); } finally { setLoading(false); } };
  const downloadPdf = () => { Linking.openURL(`${BASE_URL}reports/monthly-pdf/?year=${year}&month=${month}`).catch(() => Alert.alert('Hata', 'PDF açılamadı.')); };
  useEffect(() => { fetch(); }, []);
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 15 }}>
        <TextInput style={[styles.input, { flex: 1, padding: 8 }]} value={year} onChangeText={setYear} keyboardType="numeric" />
        <TextInput style={[styles.input, { flex: 0.5, padding: 8 }]} value={month} onChangeText={setMonth} keyboardType="numeric" />
        <TouchableOpacity style={[styles.primaryBtn, { padding: 10 }]} onPress={fetch}><Text style={styles.primaryBtnTxt}>Getir</Text></TouchableOpacity>
      </View>
      {loading ? <Loader /> : report && (
        <View>
          <TouchableOpacity style={[styles.pdfBtn, { padding: 10 }]} onPress={downloadPdf}><Text style={[styles.pdfBtnTxt, { fontSize: 13 }]}>📄 Aylık PDF İndir</Text></TouchableOpacity>
          <ReportCards report={report} />
        </View>
      )}
    </View>
  );
}

function ReportCards({ report }) {
  return (
    <View>
      <View style={styles.paymentSection}>
        <View style={[styles.payBox, {borderColor: '#4CAF50', padding: 8}]}><Text style={styles.payLabel}>💵 NAKİT</Text><Text style={[styles.payVal, {color: '#4CAF50', fontSize: 16}]}>{fmt(report.cash_total)}</Text></View>
        <View style={[styles.payBox, {borderColor: '#2196F3', padding: 8}]}><Text style={styles.payLabel}>💳 KART</Text><Text style={[styles.payVal, {color: '#2196F3', fontSize: 16}]}>{fmt(report.card_total)}</Text></View>
      </View>
      <StatCard label="🏠 Salon Satışı" value={fmt(report.salon)} />
      <StatCard label="🎁 Misafir (Masa 11)" value={fmt(report.misafir)} />
      <StatCard label="🧡 Trendyol (Masa 12)" value={fmt(report.trendyol)} />
      <StatCard label="💜 Getir (Masa 13)" value={fmt(report.getir)} />
      <StatCard label="🛵 Kurye (Masa 14)" value={fmt(report.kurye)} />
      <StatCard label="TOPLAM HASILAT" value={fmt(report.total_revenue)} highlight />
    </View>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <View style={[styles.statCard, { padding: 12 }, highlight && styles.statCardHighlight]}>
      <Text style={[styles.statLabel, { fontSize: 11 }, highlight && { color: C.bgDark }]}>{label}</Text>
      <Text style={[styles.statValue, { fontSize: 18 }, highlight && { color: C.bgDark }]}>{value}</Text>
    </View>
  );
}

function Loader() { return <ActivityIndicator color={C.amber} style={{ marginTop: 50 }} size="large" />; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgDark },
  tabBarWrapper: { backgroundColor: C.bgMid, borderBottomWidth: 1, borderColor: C.border, zIndex: 10 },
  tabBar: { maxHeight: 50 },
  tabBarContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.full, backgroundColor: C.bgLight },
  tabActive: { backgroundColor: C.amber },
  tabTxt: { fontSize: 12, fontWeight: '700', color: C.txtSecond },
  tabTxtActive: { color: C.bgDark },
  mainScrollContent: { padding: 10, paddingBottom: 40, maxWidth: Platform.OS === 'web' ? 700 : '100%', alignSelf: 'center', width: '100%' },
  card: { backgroundColor: C.bgMid, borderRadius: R.md, marginBottom: 15, borderWidth: 1, borderColor: C.border },
  formTitle: { color: C.amber, fontWeight: '900', marginBottom: 8 },
  label: { color: C.txtSecond, fontSize: 10, marginBottom: 4, fontWeight: '700' },
  input: { backgroundColor: C.bgLight, borderRadius: R.sm, color: C.txtPrimary, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  catSelectBtn: { paddingHorizontal: 12, borderRadius: 6, backgroundColor: C.bgLight, marginRight: 6, borderWidth: 1, borderColor: C.border },
  catSelectBtnActive: { backgroundColor: C.amber, borderColor: C.amber },
  catSelectTxt: { color: C.txtPrimary, fontWeight: '600' },
  catSelectTxtActive: { color: C.bgDark, fontWeight: '800' },
  primaryBtn: { backgroundColor: C.amber, borderRadius: R.sm, alignItems: 'center' },
  primaryBtnTxt: { color: C.bgDark, fontWeight: '800', fontSize: 13 },
  itemCard: { backgroundColor: C.bgMid, borderRadius: R.sm, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  productName: { color: C.txtPrimary, fontWeight: '700' },
  priceAmt: { color: C.amber, fontWeight: '800' },
  statCard: { backgroundColor: C.bgMid, borderRadius: R.md, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  statCardHighlight: { backgroundColor: C.amber },
  statLabel: { fontWeight: '700', color: C.txtSecond },
  statValue: { fontWeight: '900', color: C.txtPrimary, marginTop: 2 },
  pdfBtn: { backgroundColor: '#d32f2f', borderRadius: R.sm, marginBottom: 12, alignItems: 'center' },
  pdfBtnTxt: { color: '#fff', fontWeight: '800' },
  paymentSection: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  payBox: { flex: 1, borderRadius: R.sm, borderWidth: 2, alignItems: 'center', backgroundColor: C.bgMid },
  payLabel: { fontSize: 10, fontWeight: '800', marginBottom: 2 },
  payVal: { fontWeight: '900' }
});
