# Keep kotlinx.serialization metadata for our @Serializable data classes.
-keep,allowobfuscation,allowshrinking class kotlin.Metadata
-keep,allowobfuscation,allowshrinking class kotlinx.serialization.** { *; }
-keepclasseswithmembers class com.mintwise.expense.** {
    @kotlinx.serialization.Serializable <fields>;
}
