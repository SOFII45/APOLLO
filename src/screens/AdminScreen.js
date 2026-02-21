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
import { C, F, R, S } from '../constants/theme';

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
    // Web'de çift kaydırmayı engellemek için ana View'ı sabit tutuyoruz
    <View style={styles.root}>
      <View style={styles.tabBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => setActiveTab(t.key)}>
              <Text style={[styles.tabTxt, activeTab === t.key && styles.tabTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* ScrollView artık tüm içeriği kaplıyor ve TEK bir kaydırma çubuğu üretiyor */}
      <ScrollView 
        style={styles.contentArea} 
        contentContainerStyle={styles.tabContent}
        showsVerticalScrollIndicator={true}
      >
        {activeTab === 'products'   && <ProductsTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'daily'      && <DailyTab />}
        {activeTab === 'monthly'    && <MonthlyTab />}
      </ScrollView>
    </View>
  );
}

// ── PRODUCTS TAB ───────────────────────────────────────────────────────────────
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
      setProducts(p);
      setCategories(c);
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
    setEditingId(p.id);
    setNewName(p.name);
    setNewPrice(p.price.toString());
    setNewCatId(p.category);
  };

  const handleDelete = (id) => {
    Alert.alert('Ürünü Sil', 'Bu ürünü tamamen silmek istediğine emin misin?', [
      { text: 'Vazgeç' },
      { text: 'SİL', style: 'destructive', onPress: async () => {
          try {
            await deleteProduct(id);
            setProducts(prev => prev.filter(p => p.id !== id));
          } catch (e) { Alert.alert('Hata', "Silinemedi."); }
      }}
    ]);
  };

  if (loading) return <Loader />;

  return (
    <View style={styles.innerContent}>
      <View style={styles.card}>
        <Text style={styles.formTitle}>{editingId ? "🎁 Ürünü Düzenle" : "🆕 Yeni Ürün Ekle"}</Text>
        <TextInput style={styles.input} placeholder="Ürün Adı" value={newName} onChangeText={setNewName} placeholderTextColor={C.txtDim} />
        <TextInput style={styles.input} placeholder="Fiyat" value={newPrice} onChangeText={setNewPrice} keyboardType="numeric" placeholderTextColor={C.txtDim} />

        <Text style={styles.label}>Kategori Seç:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
          {categories.map(c => (
            <TouchableOpacity key={c.id} onPress={() => setNewCatId(c.id)}
              style={[styles.catSelectBtn, newCatId === c.id && styles.catSelectBtnActive]}>
              <Text style={[styles.catSelectTxt, newCatId === c.id && styles.catSelectTxtActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{flexDirection: 'row', gap: 10}}>
            <TouchableOpacity style={[styles.primaryBtn, {flex: 2}]} onPress={handleSave} disabled={saving}>
                <Text style={styles.primaryBtnTxt}>{editingId ? "GÜNCELLE" : "KAYDET"}</Text>
            </TouchableOpacity>
            {editingId && (
                <TouchableOpacity style={[styles.primaryBtn, {flex: 1, backgroundColor: C.bgLight}]} onPress={() => {setEditingId(null); setNewName(''); setNewPrice('');}}>
                    <Text style={[styles.primaryBtnTxt, {color: C.txtPrimary}]}>İPTAL</Text>
                </TouchableOpacity>
            )}
        </View>
      </View>

      {products.map(p => (
        <View key={p.id} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{p.name}</Text>
            <Text style={styles.priceAmt}>{fmt(p.price)}</Text>
          </View>
          <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity onPress={() => startEdit(p)}><Text style={{fontSize: 22}}>✏️</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(p.id)}><Text style={{fontSize: 22}}>🗑️</Text></TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── CATEGORIES TAB ────────────────────────────────────────────────────────────
function CategoriesTab() {
  const [cats, setCats] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const data = await getCategories(); setCats(data); } 
    catch (e) { Alert.alert('Hata', extractError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await createCategory({ name: newName.trim(), order: cats.length + 1 });
      setNewName(''); load(); 
    } catch (e) { Alert.alert('Hata', extractError(e)); }
  };

  const handleDelete = (id) => {
    Alert.alert('Kategoriyi Sil', 'Bu kategoriyi tamamen silmek istiyor musun?', [
      { text: 'Vazgeç' },
      { text: 'SİL', style: 'destructive', onPress: async () => {
        try { await deleteCategory(id); load(); } catch (e) { Alert.alert('Hata', "Silinemedi."); }
      }}
    ]);
  };

  if (loading) return <Loader />;

  return (
    <View style={styles.innerContent}>
      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Yeni Kategori Adı" value={newName} onChangeText={setNewName} placeholderTextColor={C.txtDim} />
        <TouchableOpacity style={styles.primaryBtn} onPress={handleAdd}><Text style={styles.primaryBtnTxt}>Kategori Ekle</Text></TouchableOpacity>
      </View>
      {cats.map(c => (
        <View key={c.id} style={styles.itemCard}>
          <Text style={[styles.productName, {flex: 1}]}>{c.name}</Text>
          <TouchableOpacity onPress={() => handleDelete(c.id)}><Text style={{fontSize: 22}}>🗑️</Text></TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

// ── DAILY / MONTHLY (Raporlar aynı yapı) ────────────────────────────────────────────────────────────
function DailyTab() {
  const [dateStr, setDateStr] = useState(todayStr());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetch = async () => {
    setLoading(true);
    try { setReport(await getDailyReport(dateStr)); } catch (e) { Alert.alert('Hata', extractError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);
  return (
    <View style={styles.innerContent}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 15 }}>
        <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={dateStr} onChangeText={setDateStr} />
        <TouchableOpacity style={styles.primaryBtn} onPress={fetch}><Text style={styles.primaryBtnTxt}>Getir</Text></TouchableOpacity>
      </View>
      {loading ? <Loader /> : report && <ReportCards report={report} />}
    </View>
  );
}

function MonthlyTab() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetch = async () => {
    setLoading(true);
    try { setReport(await getMonthlyReport(year, month)); } catch (e) { Alert.alert('Hata', extractError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);
  return (
    <View style={styles.innerContent}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 15 }}>
        <TextInput style={[styles.input, { flex: 1 }]} value={year} onChangeText={setYear} />
        <TextInput style={[styles.input, { flex: 0.5 }]} value={month} onChangeText={setMonth} />
        <TouchableOpacity style={styles.primaryBtn} onPress={fetch}><Text style={styles.primaryBtnTxt}>Getir</Text></TouchableOpacity>
      </View>
      {loading ? <Loader /> : report && <ReportCards report={report} />}
    </View>
  );
}

function ReportCards({ report }) {
  return (
    <View>
      <View style={styles.paymentSection}>
        <View style={[styles.payBox, {borderColor: '#4CAF50'}]}>
          <Text style={styles.payLabel}>💵 NAKİT</Text>
          <Text style={[styles.payVal, {color: '#4CAF50'}]}>{fmt(report.cash_total)}</Text>
        </View>
        <View style={[styles.payBox, {borderColor: '#2196F3'}]}>
          <Text style={styles.payLabel}>💳 KART</Text>
          <Text style={[styles.payVal, {color: '#2196F3'}]}>{fmt(report.card_total)}</Text>
        </View>
      </View>
      <StatCard label="TOPLAM HASILAT" value={fmt(report.total_revenue)} highlight />
      <StatCard label="🏠 Salon Satışı" value={fmt(report.salon)} />
    </View>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <Text style={[styles.statLabel, highlight && { color: C.bgDark }]}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: C.bgDark }]}>{value}</Text>
    </View>
  );
}

function Loader() { return <ActivityIndicator color={C.amber} style={{ marginTop: 50 }} size="large" />; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgDark },
  tabBarWrapper: { backgroundColor: C.bgMid, borderBottomWidth: 1, borderColor: C.border },
  tabBar: { maxHeight: 60 },
  tabBarContent: { paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.full, backgroundColor: C.bgLight },
  tabActive: { backgroundColor: C.amber },
  tabTxt: { fontSize: F.sm, fontWeight: '700', color: C.txtSecond },
  tabTxtActive: { color: C.bgDark },
  
  // ÇİFT ÇUBUĞU ÖNLEYEN KRİTİK ALAN
  contentArea: { flex: 1 }, 
  tabContent: { paddingBottom: 100 }, // İçerideki ScrollView'ın sonuna boşluk ekler
  innerContent: { 
    padding: 15, 
    width: '100%', 
    maxWidth: Platform.OS === 'web' ? 800 : '100%', 
    alignSelf: 'center' 
  },

  card: { backgroundColor: C.bgMid, borderRadius: R.lg, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  formTitle: { color: C.amber, fontWeight: '900', marginBottom: 12, fontSize: F.md },
  label: { color: C.txtSecond, fontSize: F.xs, marginBottom: 5, fontWeight: '700' },
  input: { backgroundColor: C.bgLight, borderRadius: R.sm, padding: 12, color: C.txtPrimary, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  catSelectBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, backgroundColor: C.bgLight, marginRight: 8, borderWidth: 1, borderColor: C.border },
  catSelectBtnActive: { backgroundColor: C.amber, borderColor: C.amber },
  catSelectTxt: { color: C.txtPrimary, fontWeight: '600' },
  catSelectTxtActive: { color: C.bgDark, fontWeight: '800' },
  primaryBtn: { backgroundColor: C.amber, borderRadius: R.sm, padding: 14, alignItems: 'center' },
  primaryBtnTxt: { color: C.bgDark, fontWeight: '800' },
  itemCard: { backgroundColor: C.bgMid, borderRadius: R.md, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  productName: { color: C.txtPrimary, fontWeight: '700', fontSize: F.md },
  priceAmt: { color: C.amber, fontWeight: '800', fontSize: F.md },
  statCard: { backgroundColor: C.bgMid, borderRadius: R.lg, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  statCardHighlight: { backgroundColor: C.amber },
  statLabel: { fontSize: F.xs, fontWeight: '700', color: C.txtSecond },
  statValue: { fontSize: F.xl, fontWeight: '900', color: C.txtPrimary, marginTop: 4 },
  paymentSection: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  payBox: { flex: 1, padding: 12, borderRadius: R.md, borderWidth: 2, alignItems: 'center', backgroundColor: C.bgMid },
  payLabel: { fontSize: F.xs, fontWeight: '800', marginBottom: 4 },
  payVal: { fontSize: F.lg, fontWeight: '900' }
});
