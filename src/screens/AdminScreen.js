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
    <View style={styles.root}>

      {/* TAB BAR */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabTxt, activeTab === t.key && styles.tabTxtActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* CONTENT */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.mainScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.webContainer}>
          {activeTab === 'products'   && <ProductsTab />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'daily'      && <DailyTab />}
          {activeTab === 'monthly'    && <MonthlyTab />}
        </View>
      </ScrollView>

    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                               PRODUCTS TAB                                 */
/* -------------------------------------------------------------------------- */

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [p, c] = await Promise.all([getProducts(), getCategories()]);
      setProducts(p);
      setCategories(c);
    } catch (e) { Alert.alert("Hata", extractError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Loader />;

  return (
    <>
      {products.map(p => (
        <View key={p.id} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{p.name}</Text>
            <Text style={styles.priceAmt}>{fmt(p.price)}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                               CATEGORIES TAB                               */
/* -------------------------------------------------------------------------- */

function CategoriesTab() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await getCategories();
      setCats(data);
    } catch (e) { Alert.alert("Hata", extractError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Loader />;

  return (
    <>
      {cats.map(c => (
        <View key={c.id} style={styles.itemCard}>
          <Text style={[styles.productName, { flex: 1 }]}>{c.name}</Text>
        </View>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 DAILY TAB                                  */
/* -------------------------------------------------------------------------- */

function DailyTab() {
  const [dateStr] = useState(todayStr());
  const [report, setReport] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getDailyReport(dateStr);
        setReport(data);
      } catch (e) { Alert.alert("Hata", extractError(e)); }
    })();
  }, []);

  if (!report) return <Loader />;

  return (
    <>
      <StatCard label="TOPLAM" value={fmt(report.total_revenue)} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                MONTHLY TAB                                 */
/* -------------------------------------------------------------------------- */

function MonthlyTab() {
  const now = new Date();
  const [report, setReport] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getMonthlyReport(now.getFullYear(), now.getMonth() + 1);
        setReport(data);
      } catch (e) { Alert.alert("Hata", extractError(e)); }
    })();
  }, []);

  if (!report) return <Loader />;

  return (
    <>
      <StatCard label="TOPLAM" value={fmt(report.total_revenue)} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 COMPONENTS                                 */
/* -------------------------------------------------------------------------- */

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Loader() {
  return <ActivityIndicator size="large" color={C.amber} style={{ marginTop: 40 }} />;
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgDark },

  tabBar: {
    backgroundColor: C.bgMid,
    borderBottomWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 10
  },

  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: R.full,
    backgroundColor: C.bgLight,
    marginRight: 8
  },

  tabActive: { backgroundColor: C.amber },

  tabTxt: { fontWeight: '700', color: C.txtSecond },

  tabTxtActive: { color: C.bgDark },

  mainScroll: { paddingBottom: 40 },

  webContainer: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 1100 : '100%',
    alignSelf: 'center',
    padding: 15
  },

  itemCard: {
    backgroundColor: C.bgMid,
    borderRadius: R.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border
  },

  productName: {
    color: C.txtPrimary,
    fontWeight: '700'
  },

  priceAmt: {
    color: C.amber,
    fontWeight: '800'
  },

  statCard: {
    backgroundColor: C.bgMid,
    borderRadius: R.lg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border
  },

  statLabel: {
    fontSize: F.sm,
    fontWeight: '700',
    color: C.txtSecond
  },

  statValue: {
    fontSize: F.xl,
    fontWeight: '900',
    color: C.txtPrimary,
    marginTop: 4
  }
});
